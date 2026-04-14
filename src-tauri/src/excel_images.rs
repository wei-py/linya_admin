use std::{
    collections::HashMap,
    io::{Cursor, Read},
    path::Path,
};

use roxmltree::{Document, Node};
use zip::ZipArchive;

const REL_NS: &str = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

#[derive(Debug)]
pub struct ExtractedExcelImage {
    pub sheet_name: String,
    pub sheet_path: String,
    pub drawing_path: String,
    pub source_path: String,
    pub anchor_type: String,
    pub row_index: u32,
    pub column_index: u32,
    pub cell: String,
    pub bytes: Vec<u8>,
    pub original_file_name: String,
}

#[derive(Debug)]
struct WorkbookSheetRef {
    name: String,
    path: String,
}

pub fn extract_images_from_xlsx_bytes(bytes: &[u8]) -> Result<Vec<ExtractedExcelImage>, String> {
    let files = read_zip_entries(bytes)?;
    let workbook_xml = read_utf8_file(&files, "xl/workbook.xml")?;
    let workbook_rels = read_optional_utf8_file(&files, "xl/_rels/workbook.xml.rels")?
        .map(|xml| parse_relationships(&xml))
        .transpose()?
        .unwrap_or_default();
    let sheets = parse_workbook_sheets(&workbook_xml, &workbook_rels)?;
    let mut extracted_images = Vec::new();

    for sheet in sheets {
        extracted_images.extend(extract_images_for_sheet(&files, &sheet)?);
    }

    Ok(extracted_images)
}

fn read_zip_entries(bytes: &[u8]) -> Result<HashMap<String, Vec<u8>>, String> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(|error| error.to_string())?;
    let mut files = HashMap::new();

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|error| error.to_string())?;

        if entry.is_dir() {
            continue;
        }

        let mut entry_bytes = Vec::new();
        entry.read_to_end(&mut entry_bytes)
            .map_err(|error| error.to_string())?;
        files.insert(normalize_zip_path(entry.name()), entry_bytes);
    }

    Ok(files)
}

fn read_utf8_file(files: &HashMap<String, Vec<u8>>, path: &str) -> Result<String, String> {
    let normalized_path = normalize_zip_path(path);
    let bytes = files
        .get(&normalized_path)
        .ok_or_else(|| format!("缺少 Excel 内部文件: {normalized_path}"))?;

    Ok(String::from_utf8_lossy(bytes).into_owned())
}

fn read_optional_utf8_file(
    files: &HashMap<String, Vec<u8>>,
    path: &str,
) -> Result<Option<String>, String> {
    let normalized_path = normalize_zip_path(path);

    if let Some(bytes) = files.get(&normalized_path) {
        return Ok(Some(String::from_utf8_lossy(bytes).into_owned()));
    }

    Ok(None)
}

fn parse_workbook_sheets(
    workbook_xml: &str,
    workbook_relationships: &HashMap<String, String>,
) -> Result<Vec<WorkbookSheetRef>, String> {
    let document = Document::parse(workbook_xml).map_err(|error| error.to_string())?;
    let mut sheets = Vec::new();

    for node in document.descendants().filter(|node| node.has_tag_name("sheet")) {
        let Some(name) = node.attribute("name").map(str::to_string) else {
            continue;
        };
        let Some(relationship_id) = get_relationship_id(node) else {
            continue;
        };
        let Some(target) = workbook_relationships.get(&relationship_id) else {
            continue;
        };

        sheets.push(WorkbookSheetRef {
            name,
            path: resolve_zip_path("xl/workbook.xml", target),
        });
    }

    Ok(sheets)
}

fn extract_images_for_sheet(
    files: &HashMap<String, Vec<u8>>,
    sheet: &WorkbookSheetRef,
) -> Result<Vec<ExtractedExcelImage>, String> {
    let sheet_xml = read_utf8_file(files, &sheet.path)?;
    let sheet_document = Document::parse(&sheet_xml).map_err(|error| error.to_string())?;
    let relationships_path = relationship_path_for(&sheet.path);
    let sheet_relationships = read_optional_utf8_file(files, &relationships_path)?
        .map(|xml| parse_relationships(&xml))
        .transpose()?
        .unwrap_or_default();
    let mut extracted_images = Vec::new();

    for drawing_node in sheet_document
        .descendants()
        .filter(|node| node.has_tag_name("drawing"))
    {
        let Some(relationship_id) = get_relationship_id(drawing_node) else {
            continue;
        };
        let Some(target) = sheet_relationships.get(&relationship_id) else {
            continue;
        };

        let drawing_path = resolve_zip_path(&sheet.path, target);
        extracted_images.extend(extract_images_for_drawing(files, sheet, &drawing_path)?);
    }

    Ok(extracted_images)
}

fn extract_images_for_drawing(
    files: &HashMap<String, Vec<u8>>,
    sheet: &WorkbookSheetRef,
    drawing_path: &str,
) -> Result<Vec<ExtractedExcelImage>, String> {
    let drawing_xml = read_utf8_file(files, drawing_path)?;
    let drawing_document = Document::parse(&drawing_xml).map_err(|error| error.to_string())?;
    let relationships_path = relationship_path_for(drawing_path);
    let drawing_relationships = read_optional_utf8_file(files, &relationships_path)?
        .map(|xml| parse_relationships(&xml))
        .transpose()?
        .unwrap_or_default();
    let mut extracted_images = Vec::new();

    for anchor in drawing_document.descendants().filter(|node| {
        matches!(node.tag_name().name(), "oneCellAnchor" | "twoCellAnchor")
    }) {
        let anchor_type = anchor.tag_name().name().to_string();
        let Some(from_node) = anchor.children().find(|node| node.has_tag_name("from")) else {
            continue;
        };
        let row_index = read_anchor_index(from_node, "row").unwrap_or(0);
        let column_index = read_anchor_index(from_node, "col").unwrap_or(0);
        let Some(embed_id) = find_pic_embed_id(anchor) else {
            continue;
        };
        let Some(target) = drawing_relationships.get(&embed_id) else {
            continue;
        };
        let source_path = resolve_zip_path(drawing_path, target);
        let Some(bytes) = files.get(&source_path) else {
            continue;
        };
        let original_file_name = Path::new(&source_path)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("image")
            .to_string();

        extracted_images.push(ExtractedExcelImage {
            sheet_name: sheet.name.clone(),
            sheet_path: sheet.path.clone(),
            drawing_path: drawing_path.to_string(),
            source_path: source_path.clone(),
            anchor_type,
            row_index,
            column_index,
            cell: build_cell_reference(row_index, column_index),
            bytes: bytes.clone(),
            original_file_name,
        });
    }

    Ok(extracted_images)
}

fn parse_relationships(xml: &str) -> Result<HashMap<String, String>, String> {
    let document = Document::parse(xml).map_err(|error| error.to_string())?;
    let mut relationships = HashMap::new();

    for node in document
        .descendants()
        .filter(|node| node.has_tag_name("Relationship"))
    {
        let Some(id) = node.attribute("Id").map(str::to_string) else {
            continue;
        };
        let Some(target) = node.attribute("Target").map(str::to_string) else {
            continue;
        };

        relationships.insert(id, target);
    }

    Ok(relationships)
}

fn find_pic_embed_id(anchor: Node<'_, '_>) -> Option<String> {
    let blip = anchor.descendants().find(|node| node.has_tag_name("blip"))?;

    blip.attributes()
        .find(|attribute| attribute.name() == "embed" && attribute.namespace() == Some(REL_NS))
        .map(|attribute| attribute.value().to_string())
}

fn get_relationship_id(node: Node<'_, '_>) -> Option<String> {
    node.attributes()
        .find(|attribute| attribute.name() == "id" && attribute.namespace() == Some(REL_NS))
        .map(|attribute| attribute.value().to_string())
}

fn read_anchor_index(node: Node<'_, '_>, tag_name: &str) -> Option<u32> {
    node.children()
        .find(|child| child.has_tag_name(tag_name))
        .and_then(|child| child.text())
        .and_then(|value| value.parse::<u32>().ok())
}

fn relationship_path_for(file_path: &str) -> String {
    let normalized_path = normalize_zip_path(file_path);

    if let Some((directory, file_name)) = normalized_path.rsplit_once('/') {
        return format!("{directory}/_rels/{file_name}.rels");
    }

    format!("_rels/{normalized_path}.rels")
}

fn resolve_zip_path(base_file_path: &str, target: &str) -> String {
    let normalized_target = normalize_zip_path(target);

    if !normalized_target.contains("../") && !normalized_target.contains("./") {
        if let Some((directory, _)) = normalize_zip_path(base_file_path).rsplit_once('/') {
            return normalize_zip_path(&format!("{directory}/{normalized_target}"));
        }

        return normalized_target;
    }

    let base_directory = normalize_zip_path(base_file_path)
        .rsplit_once('/')
        .map(|(directory, _)| directory.to_string())
        .unwrap_or_default();
    let mut segments = if base_directory.is_empty() {
        Vec::<String>::new()
    } else {
        base_directory.split('/').map(str::to_string).collect()
    };

    for part in normalized_target.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                segments.pop();
            }
            value => segments.push(value.to_string()),
        }
    }

    segments.join("/")
}

fn normalize_zip_path(path: &str) -> String {
    path.replace('\\', "/").trim_start_matches('/').to_string()
}

fn build_cell_reference(row_index: u32, column_index: u32) -> String {
    format!(
        "{}{}",
        column_index_to_letters(column_index),
        row_index.saturating_add(1)
    )
}

fn column_index_to_letters(column_index: u32) -> String {
    let mut value = column_index + 1;
    let mut letters = String::new();

    while value > 0 {
        let remainder = ((value - 1) % 26) as u8;
        letters.insert(0, char::from(b'A' + remainder));
        value = (value - 1) / 26;
    }

    letters
}
