import hashlib
import io
import csv
from typing import List, Dict, Any, Tuple
import openpyxl


def calculate_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def parse_csv_file(file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Parses raw CSV bytes into headers list and rows dicts."""
    text = file_bytes.decode('utf-8-sig', errors='replace')
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return [], []
    headers = [h.strip() for h in rows[0]]
    records = []
    for r in rows[1:]:
        if not any(r):
            continue
        record = {}
        for idx, h in enumerate(headers):
            val = r[idx].strip() if idx < len(r) else ""
            record[h] = val
        records.append(record)
    return headers, records


def parse_excel_file(file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Parses Excel XLSX bytes into headers list and rows dicts."""
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return [], []
    headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(rows[0])]
    records = []
    for r in rows[1:]:
        if not any(r):
            continue
        record = {}
        for idx, h in enumerate(headers):
            val = str(r[idx]).strip() if idx < len(r) and r[idx] is not None else ""
            record[h] = val
        records.append(record)
    return headers, records


def auto_map_columns(headers: List[str]) -> Dict[str, str]:
    """Auto-detects mapping from uploaded headers to standard fields."""
    mapping = {}
    lower_map = {h.lower().replace("_", "").replace(" ", ""): h for h in headers}

    candidates = {
        "market": ["market", "marketid", "marketname", "center"],
        "item": ["item", "itemid", "itemname", "commodity", "good"],
        "date": ["date", "obsdate", "observationdate", "period"],
        "price": ["price", "rate", "cost", "value"],
        "unit": ["unit", "uom", "quantityunit"],
        "source": ["source", "sourcequoted", "origin"],
        "notes": ["notes", "remarks", "comment"]
    }

    for std_field, aliases in candidates.items():
        for alias in aliases:
            if alias in lower_map:
                mapping[std_field] = lower_map[alias]
                break

    return mapping
