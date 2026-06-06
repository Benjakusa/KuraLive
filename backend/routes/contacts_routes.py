import json
import io
from flask import Blueprint, request, jsonify, g
from database import query
from utils.decorators import manager_required
from utils.helpers import generate_uuid, normalize_phone
import logging

logger = logging.getLogger(__name__)

contacts_bp = Blueprint("contacts", __name__)


@contacts_bp.route("/import", methods=["POST"])
@manager_required
def import_contacts():
    mid = g.current_user["id"]
    group_label = (request.form.get("group_label") or "").strip() or "Imported Contacts"
    default_county = (request.form.get("county") or "").strip()
    default_constituency = (request.form.get("constituency") or "").strip()
    default_ward = (request.form.get("ward") or "").strip()
    default_station = (request.form.get("polling_station") or "").strip()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    f = request.files["file"]
    filename = f.filename.lower() if f.filename else ""
    rows_raw = []

    try:
        if filename.endswith(".csv"):
            content = f.read().decode("utf-8", errors="ignore")
            lines = content.splitlines()
            if not lines:
                return jsonify({"error": "Empty file"}), 400
            header = [h.strip().lower().replace(" ", "_") for h in lines[0].split(",")]
            col = {name: i for i, name in enumerate(header)}
            for line in lines[1:]:
                if not line.strip():
                    continue
                cells = [c.strip().strip('"').strip("'") for c in line.split(",")]
                rows_raw.append(cells)
        elif filename.endswith((".xlsx", ".xls")):
            import openpyxl

            wb = openpyxl.load_workbook(io.BytesIO(f.read()), data_only=True)
            ws = wb.active
            if not ws:
                return jsonify({"error": "Empty file"}), 400
            all_rows = list(ws.iter_rows(values_only=True))
            if not all_rows:
                return jsonify({"error": "Empty file"}), 400
            header_raw = [
                str(c).strip().lower().replace(" ", "_") if c else ""
                for c in all_rows[0]
            ]
            col = {name: i for i, name in enumerate(header_raw)}
            for row in all_rows[1:]:
                cells = [str(c).strip() if c is not None else "" for c in row]
                rows_raw.append(cells)
        else:
            return jsonify({"error": "Only CSV and XLSX files are supported"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 422

    def get_col(cells, *names):
        for name in names:
            idx = col.get(name)
            if idx is not None and idx < len(cells):
                v = cells[idx].strip()
                if v:
                    return v
        return ""

    saved = 0
    skipped_invalid = 0
    skipped_duplicate = 0

    for cells in rows_raw:
        raw_phone = get_col(cells, "phone", "mobile", "number", "tel", "msisdn")
        if not raw_phone:
            skipped_invalid += 1
            continue
        phone = normalize_phone(raw_phone)
        if not phone:
            skipped_invalid += 1
            continue

        name = get_col(cells, "name", "full_name", "voter_name", "contact_name")
        county = get_col(cells, "county") or default_county
        constituency = get_col(cells, "constituency") or default_constituency
        ward = get_col(cells, "ward") or default_ward
        station = (
            get_col(cells, "polling_station", "station", "station_name")
            or default_station
        )

        cid = generate_uuid()
        try:
            query(
                """INSERT INTO sms_contacts
                   (id, manager_id, phone, name, county, constituency, ward, polling_station, group_label)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (manager_id, phone) DO UPDATE SET
                     name = EXCLUDED.name,
                     county = COALESCE(NULLIF(EXCLUDED.county,''), sms_contacts.county),
                     constituency = COALESCE(NULLIF(EXCLUDED.constituency,''), sms_contacts.constituency),
                     ward = COALESCE(NULLIF(EXCLUDED.ward,''), sms_contacts.ward),
                     polling_station = COALESCE(NULLIF(EXCLUDED.polling_station,''), sms_contacts.polling_station),
                     group_label = EXCLUDED.group_label
                """,
                (
                    cid,
                    mid,
                    phone,
                    name or None,
                    county or None,
                    constituency or None,
                    ward or None,
                    station or None,
                    group_label,
                ),
            )
            saved += 1
        except Exception as e:
            logger.error(f"[Contacts import] error for {phone}: {e}")
            skipped_duplicate += 1

    return jsonify(
        {
            "saved": saved,
            "skipped_invalid": skipped_invalid,
            "skipped_duplicate": skipped_duplicate,
            "group_label": group_label,
        }
    ), 201


@contacts_bp.route("", methods=["GET"])
@manager_required
def list_contacts():
    mid = g.current_user["id"]
    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 50)), 200)
    offset = (page - 1) * per_page

    group_label = request.args.get("group_label", "")
    county = request.args.get("county", "")
    constituency = request.args.get("constituency", "")
    ward = request.args.get("ward", "")
    station = request.args.get("polling_station", "")
    search = request.args.get("search", "")

    conditions = ["manager_id = %s"]
    params = [mid]

    if group_label:
        conditions.append("group_label = %s")
        params.append(group_label)
    if county:
        conditions.append("county = %s")
        params.append(county)
    if constituency:
        conditions.append("constituency = %s")
        params.append(constituency)
    if ward:
        conditions.append("ward = %s")
        params.append(ward)
    if station:
        conditions.append("polling_station = %s")
        params.append(station)
    if search:
        conditions.append("(name ILIKE %s OR phone ILIKE %s)")
        params += [f"%{search}%", f"%{search}%"]

    where = " AND ".join(conditions)
    rows = query(
        f"SELECT * FROM sms_contacts WHERE {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
        params + [per_page, offset],
        fetchall=True,
    )
    total = query(
        f"SELECT COUNT(*) as c FROM sms_contacts WHERE {where}", params, fetchone=True
    )["c"]

    return jsonify(
        {"data": rows or [], "total": total, "page": page, "per_page": per_page}
    )


@contacts_bp.route("/groups", methods=["GET"])
@manager_required
def list_groups():
    mid = g.current_user["id"]
    county_filter = request.args.get("county", "")
    constituency_filter = request.args.get("constituency", "")
    ward_filter = request.args.get("ward", "")
    station_filter = request.args.get("polling_station", "")

    conditions = ["manager_id = %s"]
    params = [mid]
    if county_filter:
        conditions.append("county = %s")
        params.append(county_filter)
    if constituency_filter:
        conditions.append("constituency = %s")
        params.append(constituency_filter)
    if ward_filter:
        conditions.append("ward = %s")
        params.append(ward_filter)
    if station_filter:
        conditions.append("polling_station = %s")
        params.append(station_filter)

    where = " AND ".join(conditions)

    groups = query(
        f"""SELECT
              group_label,
              COUNT(*) as contact_count,
              COUNT(DISTINCT county) as county_count,
              COUNT(DISTINCT constituency) as constituency_count,
              COUNT(DISTINCT ward) as ward_count,
              COUNT(DISTINCT polling_station) as station_count,
              array_agg(DISTINCT county) FILTER (WHERE county IS NOT NULL) as counties,
              MAX(created_at) as last_updated
            FROM sms_contacts
            WHERE {where}
            GROUP BY group_label
            ORDER BY last_updated DESC""",
        params,
        fetchall=True,
    )

    geo = query(
        """SELECT
              array_agg(DISTINCT county ORDER BY county) FILTER (WHERE county IS NOT NULL) as counties,
              array_agg(DISTINCT constituency ORDER BY constituency) FILTER (WHERE constituency IS NOT NULL) as constituencies,
              array_agg(DISTINCT ward ORDER BY ward) FILTER (WHERE ward IS NOT NULL) as wards,
              array_agg(DISTINCT polling_station ORDER BY polling_station) FILTER (WHERE polling_station IS NOT NULL) as stations
            FROM sms_contacts WHERE manager_id = %s""",
        (mid,),
        fetchone=True,
    )

    return jsonify(
        {
            "data": groups or [],
            "geo_options": {
                "counties": geo["counties"] or [] if geo else [],
                "constituencies": geo["constituencies"] or [] if geo else [],
                "wards": geo["wards"] or [] if geo else [],
                "stations": geo["stations"] or [] if geo else [],
            },
        }
    )


@contacts_bp.route("/group-phones", methods=["GET"])
@manager_required
def group_phones():
    from config import Config
    mid = g.current_user["id"]
    conditions = ["manager_id = %s"]
    params = [mid]

    for col, key in [
        ("group_label", "group_label"),
        ("county", "county"),
        ("constituency", "constituency"),
        ("ward", "ward"),
        ("polling_station", "polling_station"),
    ]:
        val = request.args.get(key, "")
        if val:
            conditions.append(f"{col} = %s")
            params.append(val)

    where = " AND ".join(conditions)
    # Using MAX_PAGE_SIZE logic
    rows = query(
        f"SELECT phone, name, county, polling_station FROM sms_contacts WHERE {where} LIMIT %s",
        params + [Config.MAX_PAGE_SIZE],
        fetchall=True,
    )
    return jsonify({"data": rows or [], "count": len(rows or [])})


@contacts_bp.route("/group", methods=["DELETE"])
@manager_required
def delete_group():
    group_label = request.args.get("group_label", "").strip()
    if not group_label:
        return jsonify({"error": "group_label required"}), 400
    deleted_count = query(
        "DELETE FROM sms_contacts WHERE manager_id = %s AND group_label = %s",
        (g.current_user["id"], group_label),
    )
    return jsonify({"deleted": deleted_count})


@contacts_bp.route("/<cid>", methods=["DELETE"])
@manager_required
def delete_contact(cid):
    query(
        "DELETE FROM sms_contacts WHERE id = %s AND manager_id = %s",
        (cid, g.current_user["id"]),
    )
    return jsonify({"message": "Contact deleted"})
