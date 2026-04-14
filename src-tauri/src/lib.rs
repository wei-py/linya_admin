mod excel_images;

use std::{
    collections::HashMap,
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use excel_images::extract_images_from_xlsx_bytes;
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedImageAsset {
    file_name: String,
    file_path: String,
    relative_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExtractedExcelImageAsset {
    sheet_name: String,
    sheet_path: String,
    drawing_path: String,
    source_path: String,
    anchor_type: String,
    row_index: u32,
    column_index: u32,
    cell: String,
    file_name: String,
    file_path: String,
    relative_path: String,
}

fn sanitize_file_name_segment(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|character| match character {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' => character,
            _ => '_',
        })
        .collect::<String>()
        .trim_matches('_')
        .to_string();

    if sanitized.is_empty() {
        "image".to_string()
    } else {
        sanitized
    }
}

fn infer_image_extension(file_name: Option<&str>, bytes: &[u8]) -> String {
    if let Some(name) = file_name {
        if let Some(extension) = Path::new(name).extension().and_then(|value| value.to_str()) {
            let normalized = extension.trim().trim_start_matches('.').to_ascii_lowercase();

            if !normalized.is_empty() {
                return normalized;
            }
        }
    }

    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        return "png".to_string();
    }

    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return "jpg".to_string();
    }

    if bytes.starts_with(b"GIF8") {
        return "gif".to_string();
    }

    if bytes.starts_with(b"BM") {
        return "bmp".to_string();
    }

    if bytes.len() > 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return "webp".to_string();
    }

    "img".to_string()
}

fn save_image_bytes_to_library(
    app: &AppHandle,
    bytes: &[u8],
    file_name: Option<&str>,
    preferred_stem: Option<&str>,
) -> Result<SavedImageAsset, String> {
    if bytes.is_empty() {
        return Err("图片内容为空".to_string());
    }

    let image_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join("img");

    fs::create_dir_all(&image_dir).map_err(|error| error.to_string())?;

    let original_name = file_name.unwrap_or("image");
    let stem = preferred_stem
        .map(sanitize_file_name_segment)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            Path::new(original_name)
                .file_stem()
                .and_then(|value| value.to_str())
                .map(sanitize_file_name_segment)
                .unwrap_or_else(|| "image".to_string())
        });
    let extension = infer_image_extension(Some(original_name), bytes);
    let saved_file_name = if preferred_stem.is_some() {
        format!("{stem}.{extension}")
    } else {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);

        format!("{stem}_{timestamp}.{extension}")
    };
    let saved_path = image_dir.join(&saved_file_name);

    fs::write(&saved_path, bytes).map_err(|error| error.to_string())?;

    Ok(SavedImageAsset {
        file_name: saved_file_name.clone(),
        file_path: saved_path.display().to_string(),
        relative_path: format!("img/{saved_file_name}"),
    })
}

#[tauri::command]
fn pick_excel_file() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("Excel", &["xlsx", "xls"])
        .pick_file()
        .map(|path| path.display().to_string())
}

#[tauri::command]
fn save_excel_file() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("Excel", &["xlsx"])
        .set_file_name("商品列表.xlsx")
        .save_file()
        .map(|path| path.display().to_string())
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_binary_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(path, bytes).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_image_asset(
    app: AppHandle,
    bytes: Vec<u8>,
    file_name: Option<String>,
) -> Result<SavedImageAsset, String> {
    save_image_bytes_to_library(&app, &bytes, file_name.as_deref(), None)
}

#[tauri::command]
fn extract_excel_embedded_images(
    app: AppHandle,
    path: String,
) -> Result<Vec<ExtractedExcelImageAsset>, String> {
    if !path.to_ascii_lowercase().ends_with(".xlsx") {
        return Err("当前仅支持从 .xlsx 提取嵌入图片".to_string());
    }

    let workbook_name = Path::new(&path)
        .file_stem()
        .and_then(|value| value.to_str())
        .map(sanitize_file_name_segment)
        .unwrap_or_else(|| "workbook".to_string());
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    let extracted_images = extract_images_from_xlsx_bytes(&bytes)?;
    let mut saved_assets = HashMap::<String, SavedImageAsset>::new();
    let mut image_assets = Vec::new();

    for image in extracted_images {
        let saved_asset = if let Some(asset) = saved_assets.get(&image.source_path) {
            asset.clone()
        } else {
            let preferred_stem = format!(
                "excel_{}_{}_{}",
                workbook_name, image.sheet_name, image.cell
            );
            let asset = save_image_bytes_to_library(
                &app,
                &image.bytes,
                Some(&image.original_file_name),
                Some(&preferred_stem),
            )?;

            saved_assets.insert(image.source_path.clone(), asset.clone());
            asset
        };

        image_assets.push(ExtractedExcelImageAsset {
            sheet_name: image.sheet_name,
            sheet_path: image.sheet_path,
            drawing_path: image.drawing_path,
            source_path: image.source_path,
            anchor_type: image.anchor_type,
            row_index: image.row_index,
            column_index: image.column_index,
            cell: image.cell,
            file_name: saved_asset.file_name,
            file_path: saved_asset.file_path,
            relative_path: saved_asset.relative_path,
        });
    }

    Ok(image_assets)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            pick_excel_file,
            save_excel_file,
            read_binary_file,
            write_binary_file,
            save_image_asset,
            extract_excel_embedded_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
