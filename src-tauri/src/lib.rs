mod excel_images;

use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use excel_images::extract_images_from_xlsx_bytes;
use rust_xlsxwriter::{
    Color, Format, FormatAlign, FormatBorder, Image, Workbook, Worksheet,
};
use serde::{Deserialize, Serialize};
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

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListRecord {
    id: String,
    name: String,
    sku: String,
    country: String,
    platform: String,
    category: String,
    ad_type: String,
    shipping_included: String,
    current_benchmark: String,
    current_benchmark_key: String,
    cost: String,
    weight: String,
    seller_shipping: String,
    total_fee: String,
    discount_price: String,
    list_price: String,
    profit_rate: String,
    net_profit: String,
    revenue: String,
    shipping_default: String,
    activity_fee: String,
    transaction_fee: String,
    commission_fee: String,
    withdraw_fee: String,
    exchange_loss_fee: String,
    tax_fee: String,
    label_fee: String,
    fixed_surcharge: String,
    notes: String,
    cover_image_id: String,
    variant_summary: String,
    preset_snapshot_json: String,
    calculation_snapshot_json: String,
    created_at: String,
    updated_at: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListImageEntry {
    id: String,
    product_id: String,
    sort: u32,
    role: String,
    source_type: String,
    file_name: String,
    file_path: String,
    relative_path: String,
    variant_group_id: String,
    variant_option_id: String,
    is_cover: u8,
    excel_image_cell: String,
    remark: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListVariantEntry {
    id: String,
    product_id: String,
    group_id: String,
    group_name: String,
    option_id: String,
    option_value: String,
    sort: u32,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListFieldEntry {
    id: String,
    product_id: String,
    field_key: String,
    field_label: String,
    field_value: String,
    sort: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListWorkbookPayload {
    records: Vec<ListRecord>,
    images: Vec<ListImageEntry>,
    variants: Vec<ListVariantEntry>,
    fields: Vec<ListFieldEntry>,
}

fn create_header_format() -> Format {
    Format::new()
        .set_bold()
        .set_font_color(Color::RGB(0x161616))
        .set_background_color(Color::RGB(0xD9F0F2))
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter)
}

fn create_cell_format() -> Format {
    Format::new()
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter)
}

fn write_sheet_headers(
    worksheet: &mut Worksheet,
    headers: &[&str],
    header_format: &Format,
) -> Result<(), String> {
    for (index, header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, index as u16, *header, header_format)
            .map_err(|error| error.to_string())?;
    }

    worksheet
        .set_freeze_panes(1, 0)
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn write_main_sheet(
    workbook: &mut Workbook,
    payload: &ListWorkbookPayload,
) -> Result<(), String> {
    let worksheet = workbook.add_worksheet();
    let header_format = create_header_format();
    let cell_format = create_cell_format();
    let headers = [
        "名称",
        "款号",
        "图片",
        "图片路径",
        "变体",
        "国家",
        "平台",
        "类目",
        "广告类型",
        "是否包邮",
        "当前基准",
        "成本",
        "重量(g)",
        "境内运费",
        "总费用(R$)",
        "折后价格(R$)",
        "折前价格(R$)",
        "利润率",
        "净利润(R$)",
        "收入(R$)",
        "预设是否包邮",
        "活动费",
        "交易费",
        "佣金费",
        "提现费",
        "汇损",
        "税费",
        "贴单费",
        "固定附加费",
        "备注",
    ];

    worksheet
        .set_name("商品列表")
        .map_err(|error| error.to_string())?;
    write_sheet_headers(worksheet, &headers, &header_format)?;

    let widths = [
        18.0, 16.0, 18.0, 22.0, 18.0, 10.0, 10.0, 12.0, 12.0, 12.0, 12.0, 12.0,
        12.0, 14.0, 14.0, 14.0, 12.0, 14.0, 12.0, 14.0, 12.0, 12.0, 12.0, 12.0,
        12.0, 12.0, 12.0, 14.0, 20.0,
    ];

    for (index, width) in widths.iter().enumerate() {
        worksheet
            .set_column_width(index as u16, *width)
            .map_err(|error| error.to_string())?;
    }

    for (row_index, record) in payload.records.iter().enumerate() {
        let row = (row_index + 1) as u32;
        let cover_image = payload.images.iter().find(|image| {
            image.id == record.cover_image_id
                || (image.product_id == record.id && image.is_cover == 1)
        });
        let cover_image_path = cover_image
            .map(|image| image.relative_path.as_str())
            .unwrap_or("");
        let values = [
            record.name.as_str(),
            record.sku.as_str(),
            "",
            cover_image_path,
            record.variant_summary.as_str(),
            record.country.as_str(),
            record.platform.as_str(),
            record.category.as_str(),
            record.ad_type.as_str(),
            record.shipping_included.as_str(),
            record.current_benchmark.as_str(),
            record.cost.as_str(),
            record.weight.as_str(),
            record.seller_shipping.as_str(),
            record.total_fee.as_str(),
            record.discount_price.as_str(),
            record.list_price.as_str(),
            record.profit_rate.as_str(),
            record.net_profit.as_str(),
            record.revenue.as_str(),
            record.shipping_default.as_str(),
            record.activity_fee.as_str(),
            record.transaction_fee.as_str(),
            record.commission_fee.as_str(),
            record.withdraw_fee.as_str(),
            record.exchange_loss_fee.as_str(),
            record.tax_fee.as_str(),
            record.label_fee.as_str(),
            record.fixed_surcharge.as_str(),
            record.notes.as_str(),
        ];

        for (column_index, value) in values.iter().enumerate() {
            worksheet
                .write_string_with_format(row, column_index as u16, *value, &cell_format)
                .map_err(|error| error.to_string())?;
        }

        if let Some(image_entry) = cover_image {
            if !image_entry.file_path.is_empty() {
                let image_bytes =
                    fs::read(&image_entry.file_path).map_err(|error| error.to_string())?;
                let image =
                    Image::new_from_buffer(&image_bytes).map_err(|error| error.to_string())?;
                worksheet
                    .set_row_height(row, 66.0)
                    .map_err(|error| error.to_string())?;
                worksheet
                    .embed_image(row, 2, &image)
                    .map_err(|error| error.to_string())?;
            }
        }
    }

    Ok(())
}

fn write_generic_sheet(
    workbook: &mut Workbook,
    sheet_name: &str,
    headers: &[&str],
    rows: &[Vec<String>],
) -> Result<(), String> {
    let worksheet = workbook.add_worksheet();
    let header_format = create_header_format();
    let cell_format = create_cell_format();

    worksheet
        .set_name(sheet_name)
        .map_err(|error| error.to_string())?;
    write_sheet_headers(worksheet, headers, &header_format)?;

    for (index, header) in headers.iter().enumerate() {
        let width = (header.chars().count() as f64 + 6.0).max(12.0);

        worksheet
            .set_column_width(index as u16, width)
            .map_err(|error| error.to_string())?;
    }

    for (row_index, row_values) in rows.iter().enumerate() {
        let row = (row_index + 1) as u32;

        for (column_index, value) in row_values.iter().enumerate() {
            worksheet
                .write_string_with_format(row, column_index as u16, value, &cell_format)
                .map_err(|error| error.to_string())?;
        }
    }

    Ok(())
}

fn copy_list_images_to_workbook_dir(
    workbook_path: &str,
    payload: &mut ListWorkbookPayload,
) -> Result<(), String> {
    let workbook_dir = Path::new(workbook_path)
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let image_dir = workbook_dir.join("img");

    fs::create_dir_all(&image_dir).map_err(|error| error.to_string())?;

    for image in payload.images.iter_mut() {
        if image.file_path.trim().is_empty() {
            continue;
        }

        let source_path = Path::new(&image.file_path);

        if !source_path.exists() {
            continue;
        }

        let original_name = if image.file_name.trim().is_empty() {
            source_path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("image")
                .to_string()
        } else {
            image.file_name.clone()
        };
        let file_stem = Path::new(&original_name)
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("image");
        let extension = source_path
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.trim().trim_start_matches('.').to_ascii_lowercase())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "png".to_string());
        let copied_name = format!(
            "{}_{}_{}.{}",
            sanitize_file_name_segment(&image.product_id),
            image.sort,
            sanitize_file_name_segment(file_stem),
            extension
        );
        let target_path = image_dir.join(&copied_name);

        fs::copy(source_path, &target_path).map_err(|error| error.to_string())?;

        image.file_name = copied_name.clone();
        image.file_path = target_path.display().to_string();
        image.relative_path = format!("img/{copied_name}");
    }

    Ok(())
}

#[tauri::command]
fn export_list_workbook(path: String, mut payload: ListWorkbookPayload) -> Result<(), String> {
    let mut workbook = Workbook::new();

    copy_list_images_to_workbook_dir(&path, &mut payload)?;
    write_main_sheet(&mut workbook, &payload)?;
    write_generic_sheet(
        &mut workbook,
        "商品记录",
        &[
            "id",
            "name",
            "sku",
            "global_sku",
            "country",
            "platform",
            "category",
            "ad_type",
            "shipping_included",
            "current_benchmark",
            "current_benchmark_key",
            "cost",
            "weight",
            "seller_shipping",
            "total_fee",
            "discount_price",
            "list_price",
            "profit_rate",
            "net_profit",
            "revenue",
            "shipping_default",
            "activity_fee",
            "transaction_fee",
            "commission_fee",
            "withdraw_fee",
            "exchange_loss_fee",
            "tax_fee",
            "label_fee",
            "fixed_surcharge",
            "notes",
            "cover_image_id",
            "variant_summary",
            "preset_snapshot_json",
            "calculation_snapshot_json",
            "created_at",
            "updated_at",
        ],
        &payload
            .records
            .iter()
            .map(|item| {
                vec![
                    item.id.clone(),
                    item.name.clone(),
                    item.sku.clone(),
                    String::new(),
                    item.country.clone(),
                    item.platform.clone(),
                    item.category.clone(),
                    item.ad_type.clone(),
                    item.shipping_included.clone(),
                    item.current_benchmark.clone(),
                    item.current_benchmark_key.clone(),
                    item.cost.clone(),
                    item.weight.clone(),
                    item.seller_shipping.clone(),
                    item.total_fee.clone(),
                    item.discount_price.clone(),
                    item.list_price.clone(),
                    item.profit_rate.clone(),
                    item.net_profit.clone(),
                    item.revenue.clone(),
                    item.shipping_default.clone(),
                    item.activity_fee.clone(),
                    item.transaction_fee.clone(),
                    item.commission_fee.clone(),
                    item.withdraw_fee.clone(),
                    item.exchange_loss_fee.clone(),
                    item.tax_fee.clone(),
                    item.label_fee.clone(),
                    item.fixed_surcharge.clone(),
                    item.notes.clone(),
                    item.cover_image_id.clone(),
                    item.variant_summary.clone(),
                    item.preset_snapshot_json.clone(),
                    item.calculation_snapshot_json.clone(),
                    item.created_at.clone(),
                    item.updated_at.clone(),
                ]
            })
            .collect::<Vec<_>>(),
    )?;
    write_generic_sheet(
        &mut workbook,
        "图片关系",
        &[
            "id",
            "product_id",
            "sort",
            "role",
            "source_type",
            "file_name",
            "file_path",
            "relative_path",
            "variant_group_id",
            "variant_option_id",
            "is_cover",
            "excel_image_cell",
            "remark",
        ],
        &payload
            .images
            .iter()
            .map(|item| {
                vec![
                    item.id.clone(),
                    item.product_id.clone(),
                    item.sort.to_string(),
                    item.role.clone(),
                    item.source_type.clone(),
                    item.file_name.clone(),
                    item.file_path.clone(),
                    item.relative_path.clone(),
                    item.variant_group_id.clone(),
                    item.variant_option_id.clone(),
                    item.is_cover.to_string(),
                    item.excel_image_cell.clone(),
                    item.remark.clone(),
                ]
            })
            .collect::<Vec<_>>(),
    )?;
    write_generic_sheet(
        &mut workbook,
        "变体关系",
        &[
            "id",
            "product_id",
            "group_id",
            "group_name",
            "option_id",
            "option_value",
            "sort",
        ],
        &payload
            .variants
            .iter()
            .map(|item| {
                vec![
                    item.id.clone(),
                    item.product_id.clone(),
                    item.group_id.clone(),
                    item.group_name.clone(),
                    item.option_id.clone(),
                    item.option_value.clone(),
                    item.sort.to_string(),
                ]
            })
            .collect::<Vec<_>>(),
    )?;
    write_generic_sheet(
        &mut workbook,
        "扩展字段",
        &["id", "product_id", "field_key", "field_label", "field_value", "sort"],
        &payload
            .fields
            .iter()
            .map(|item| {
                vec![
                    item.id.clone(),
                    item.product_id.clone(),
                    item.field_key.clone(),
                    item.field_label.clone(),
                    item.field_value.clone(),
                    item.sort.to_string(),
                ]
            })
            .collect::<Vec<_>>(),
    )?;
    write_generic_sheet(
        &mut workbook,
        "程序信息",
        &[
            "app_version",
            "exported_at",
            "list_workbook_version",
            "main_sheet_name",
            "description",
        ],
        &[vec![
            "linya-admin".to_string(),
            format!("{:?}", SystemTime::now()),
            "1".to_string(),
            "商品列表".to_string(),
            "商品列表给用户查看；图片关系、变体关系、扩展字段由程序维护。"
                .to_string(),
        ]],
    )?;

    workbook.save(path).map_err(|error| error.to_string())
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
            export_list_workbook,
            save_image_asset,
            extract_excel_embedded_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
