import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FaSms, FaUpload, FaDatabase, FaPaperPlane, FaSearch, FaDownload,
    FaTimes, FaCheckCircle, FaSave, FaFileAlt, FaUsers, FaMapMarkerAlt,
    FaTrash, FaChevronDown, FaFilter, FaPlus,
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_COLORS = {
    draft: { bg: '#f3f4f6', color: '#374151' },
    scheduled: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
    sending: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
    sent: { bg: 'rgba(0,179,179,0.12)', color: '#008080' },
    failed: { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
};

const GEO_BADGE_COLORS = [
    { bg: 'rgba(99,102,241,0.12)', color: '#4f46e5' },
    { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
    { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
    { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
];

// ─── CONTACTS TAB ─────────────────────────────────────────────────────────────

function ContactsTab({ onSelectGroup, token }) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const [groups, setGroups] = useState([]);
    const [geoOptions, setGeoOptions] = useState({ counties: [], constituencies: [], wards: [], stations: [] });
    const [filter, setFilter] = useState({ county: '', constituency: '', ward: '', polling_station: '' });
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [search, setSearch] = useState('');

    const fetchGroups = useCallback(async () => {
        const params = new URLSearchParams();
        if (filter.county) params.set('county', filter.county);
        if (filter.constituency) params.set('constituency', filter.constituency);
        if (filter.ward) params.set('ward', filter.ward);
        if (filter.polling_station) params.set('polling_station', filter.polling_station);
        const r = await fetch(`${API}/api/contacts/groups?${params}`, { headers });
        const d = await r.json();
        setGroups(d.data || []);
        setGeoOptions(d.geo_options || { counties: [], constituencies: [], wards: [], stations: [] });
    }, [filter]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    const counties = geoOptions.counties || [];
    const constituencies = geoOptions.constituencies || [];
    const wards = geoOptions.wards || [];
    const stations = geoOptions.stations || [];

    const filtered = search
        ? groups.filter(g => g.group_label?.toLowerCase().includes(search.toLowerCase()))
        : groups;

    async function handleDelete(label) {
        if (!window.confirm(`Delete all contacts in "${label}"?`)) return;
        setDeleting(label);
        await fetch(`${API}/api/contacts/group?group_label=${encodeURIComponent(label)}`, {
            method: 'DELETE', headers,
        });
        setDeleting(null);
        fetchGroups();
        if (selectedGroup === label) { setSelectedGroup(null); onSelectGroup(null, 0); }
    }

    async function handleSelect(label) {
        setSelectedGroup(label);
        const params = new URLSearchParams({ group_label: label });
        if (filter.county) params.set('county', filter.county);
        if (filter.constituency) params.set('constituency', filter.constituency);
        if (filter.ward) params.set('ward', filter.ward);
        if (filter.polling_station) params.set('polling_station', filter.polling_station);
        const r = await fetch(`${API}/api/contacts/group-phones?${params}`, { headers });
        const d = await r.json();
        onSelectGroup(d.data || [], label);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                    ['county', 'County', counties],
                    ['constituency', 'Constituency', constituencies],
                    ['ward', 'Ward', wards],
                    ['polling_station', 'Polling Station', stations],
                ].map(([key, label, opts]) => (
                    <div key={key}>
                        <label style={{ fontSize: '0.75rem', marginBottom: 2, display: 'block', color: 'var(--color-text-muted)' }}>
                            <FaFilter style={{ fontSize: '0.65rem' }} /> {label}
                        </label>
                        <select className="select" value={filter[key]}
                            onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}>
                            <option value="">All</option>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                ))}
            </div>

            <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: '0.8rem' }} />
                <input className="input" placeholder="Search groups…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '2rem', fontSize: '0.85rem' }} />
            </div>

            {filtered.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <FaUsers style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No contact groups yet. Upload a CSV to get started.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflowY: 'auto' }}>
                    {filtered.map((g, idx) => {
                        const isSelected = selectedGroup === g.group_label;
                        const badge = GEO_BADGE_COLORS[idx % GEO_BADGE_COLORS.length];
                        const geoTags = [];
                        if (g.counties && g.counties.length) geoTags.push(...g.counties.slice(0, 2));
                        return (
                            <div key={g.group_label}
                                onClick={() => handleSelect(g.group_label)}
                                style={{
                                    padding: '0.75rem 1rem', borderRadius: 10,
                                    border: `2px solid ${isSelected ? 'var(--teal)' : 'var(--color-border)'}`,
                                    background: isSelected ? 'var(--teal-light)' : 'var(--color-surface)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem',
                                }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                        {isSelected && <FaCheckCircle style={{ color: 'var(--teal)', fontSize: '0.8rem', flexShrink: 0 }} />}
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {g.group_label}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--teal)' }}>
                                            {Number(g.contact_count).toLocaleString()} contacts
                                        </span>
                                        {geoTags.map(tag => (
                                            <span key={tag} style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: 99, ...badge }}>
                                                <FaMapMarkerAlt style={{ fontSize: '0.6rem' }} /> {tag}
                                            </span>
                                        ))}
                                        {g.counties && g.counties.length > 2 && (
                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                                +{g.counties.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                        {g.ward_count > 0 && `${g.ward_count} ward${g.ward_count > 1 ? 's' : ''} · `}
                                        {g.station_count > 0 && `${g.station_count} station${g.station_count > 1 ? 's' : ''} · `}
                                        Updated {new Date(g.last_updated).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); handleDelete(g.group_label); }}
                                    disabled={deleting === g.group_label}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px', flexShrink: 0, opacity: 0.6 }}
                                    title="Delete group">
                                    <FaTrash style={{ fontSize: '0.8rem' }} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── UPLOAD TAB ───────────────────────────────────────────────────────────────

function UploadTab({ onLoadNumbers, token }) {
    const [uploadedNumbers, setUploadedNumbers] = useState([]);
    const [preview, setPreview] = useState([]);
    const [uploadCount, setUploadCount] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState(null);
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [groupLabel, setGroupLabel] = useState('');
    const [geoTag, setGeoTag] = useState({ county: '', constituency: '', ward: '', polling_station: '' });
    const fileRef = useRef();

    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        setUploadStatus('Parsing…');
        setSaveResult(null);
        setShowSaveForm(false);
        const form = new FormData();
        form.append('file', file);
        const r = await fetch(`${API}/api/sms/upload-numbers`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        const d = await r.json();
        if (r.ok) {
            setUploadedNumbers(d.numbers || []);
            setPreview(d.preview || []);
            setUploadCount(d.count || 0);
            setUploadStatus(`✓ ${d.count} valid numbers (${d.invalid_count} invalid skipped)`);
            setShowSaveForm(true);
            onLoadNumbers(d.numbers || []);
            setGroupLabel(file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
        } else {
            setUploadStatus(`Error: ${d.error}`);
        }
    }

    async function handleSaveContacts() {
        if (!groupLabel.trim() || !uploadedNumbers.length) return;
        setSaving(true);
        const csvLines = ['phone', ...uploadedNumbers].join('\n');
        const blob = new Blob([csvLines], { type: 'text/csv' });
        const form = new FormData();
        form.append('file', blob, 'contacts.csv');
        form.append('group_label', groupLabel.trim());
        if (geoTag.county) form.append('county', geoTag.county);
        if (geoTag.constituency) form.append('constituency', geoTag.constituency);
        if (geoTag.ward) form.append('ward', geoTag.ward);
        if (geoTag.polling_station) form.append('polling_station', geoTag.polling_station);

        const r = await fetch(`${API}/api/contacts/import`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        const d = await r.json();
        setSaving(false);
        if (r.ok) {
            setSaveResult({ ok: true, saved: d.saved, label: d.group_label });
            setShowSaveForm(false);
        } else {
            setSaveResult({ ok: false, error: d.error });
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={() => fileRef.current.click()} className="btn btn-outline" style={{ width: '100%' }}>
                <FaUpload /> Choose CSV or XLSX file
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />

            {uploadStatus && (
                <p style={{ fontSize: '0.85rem', color: uploadStatus.startsWith('✓') ? 'var(--teal)' : 'var(--danger)', margin: 0 }}>
                    {uploadStatus}
                </p>
            )}

            {preview.length > 0 && (
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: 'var(--gray-100)' }}>
                            <th style={{ padding: '4px 8px', textAlign: 'left' }}>#</th>
                            <th style={{ padding: '4px 8px', textAlign: 'left' }}>Phone</th>
                        </tr></thead>
                        <tbody>
                            {preview.map((n, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '4px 8px', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{n}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {uploadCount > 10 && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.4rem 0.8rem' }}>
                            …and {uploadCount - 10} more
                        </p>
                    )}
                </div>
            )}

            {showSaveForm && (
                <div style={{ border: '1.5px dashed var(--teal)', borderRadius: 10, padding: '1rem', background: 'var(--teal-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontWeight: 700, color: 'var(--teal)', fontSize: '0.875rem' }}>
                        <FaPlus /> Save to Contact Groups
                    </div>
                    <input className="input" placeholder="Group name (e.g. Nairobi Rally List)"
                        value={groupLabel} onChange={e => setGroupLabel(e.target.value)}
                        style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }} />
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Optional: tag all contacts with a geographic area
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        {[['county', 'County'], ['constituency', 'Constituency'], ['ward', 'Ward'], ['polling_station', 'Polling Station']].map(([key, label]) => (
                            <input key={key} className="input" placeholder={label}
                                value={geoTag[key]} onChange={e => setGeoTag(g => ({ ...g, [key]: e.target.value }))}
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} />
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveContacts}
                        disabled={saving || !groupLabel.trim()} style={{ width: '100%', fontSize: '0.875rem' }}>
                        {saving ? 'Saving…' : <><FaSave /> Save {uploadCount.toLocaleString()} Contacts</>}
                    </button>
                </div>
            )}

            {saveResult && (
                <div style={{
                    padding: '0.75rem 1rem', borderRadius: 8,
                    background: saveResult.ok ? 'rgba(0,179,179,0.08)' : 'rgba(239,68,68,0.08)',
                    color: saveResult.ok ? 'var(--teal)' : 'var(--danger)',
                    fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                    {saveResult.ok
                        ? <><FaCheckCircle /> {saveResult.saved} contacts saved to "{saveResult.label}"</>
                        : `Error: ${saveResult.error}`}
                </div>
            )}
        </div>
    );
}

// ─── DATABASE TAB ─────────────────────────────────────────────────────────────

function DatabaseTab({ onSelectRecipients, token }) {
    const headers = { Authorization: `Bearer ${token}` };
    const [stations, setStations] = useState([]);
    const [geoLevel, setGeoLevel] = useState('National');
    const [geoFilter, setGeoFilter] = useState({ county: '', constituency: '', ward: '' });
    const [estimatedCount, setEstimatedCount] = useState(0);

    const GEO_LEVELS = ['National', 'County', 'Constituency', 'Ward', 'Polling Station'];

    useEffect(() => {
        fetch(`${API}/api/stations`, { headers }).then(r => r.json()).then(d => setStations(d.data || []));
    }, []);

    useEffect(() => {
        let filtered = stations;
        if (geoLevel === 'County' && geoFilter.county) filtered = filtered.filter(s => s.county === geoFilter.county);
        else if (geoLevel === 'Constituency' && geoFilter.constituency) filtered = filtered.filter(s => s.constituency === geoFilter.constituency);
        else if (geoLevel === 'Ward' && geoFilter.ward) filtered = filtered.filter(s => s.ward === geoFilter.ward);
        const est = filtered.reduce((sum, s) => sum + (s.registered_voters || 0), 0);
        setEstimatedCount(est);
        const recs = filtered
            .map(s => ({ phone: s.agent_phone || s.phone || s.contact || '', name: s.agent_name || s.name || '', station: s.name || '', county: s.county || '' }))
            .filter(r => r.phone);
        onSelectRecipients(recs);
    }, [stations, geoLevel, geoFilter]);

    const counties = [...new Set(stations.map(s => s.county).filter(Boolean))].sort();
    const constituencies = [...new Set(stations.filter(s => !geoFilter.county || s.county === geoFilter.county).map(s => s.constituency).filter(Boolean))].sort();
    const wards = [...new Set(stations.filter(s => !geoFilter.constituency || s.constituency === geoFilter.constituency).map(s => s.ward).filter(Boolean))].sort();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
                <label>Geographic Level</label>
                <select className="select" value={geoLevel} onChange={e => { setGeoLevel(e.target.value); setGeoFilter({ county: '', constituency: '', ward: '' }); }}>
                    {GEO_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
            </div>
            {['County', 'Constituency', 'Ward', 'Polling Station'].includes(geoLevel) && (
                <div>
                    <label>County</label>
                    <select className="select" value={geoFilter.county} onChange={e => setGeoFilter(f => ({ ...f, county: e.target.value, constituency: '', ward: '' }))}>
                        <option value="">All Counties</option>
                        {counties.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
            )}
            {['Constituency', 'Ward', 'Polling Station'].includes(geoLevel) && (
                <div>
                    <label>Constituency</label>
                    <select className="select" value={geoFilter.constituency} onChange={e => setGeoFilter(f => ({ ...f, constituency: e.target.value, ward: '' }))}>
                        <option value="">All Constituencies</option>
                        {constituencies.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
            )}
            {['Ward', 'Polling Station'].includes(geoLevel) && (
                <div>
                    <label>Ward</label>
                    <select className="select" value={geoFilter.ward} onChange={e => setGeoFilter(f => ({ ...f, ward: e.target.value }))}>
                        <option value="">All Wards</option>
                        {wards.map(w => <option key={w}>{w}</option>)}
                    </select>
                </div>
            )}
            <div style={{ padding: '0.75rem 1rem', background: 'var(--teal-light)', borderRadius: 8, color: 'var(--teal)', fontWeight: 600, fontSize: '0.9rem' }}>
                ~{estimatedCount.toLocaleString()} registered voters in selected area
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

function SMSBroadcast() {
    const token = localStorage.getItem('uchaguzi360_token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const [activeMode, setActiveMode] = useState('contacts');
    const [recipientsPayload, setRecipientsPayload] = useState({ type: 'none', data: [], label: '' });

    const [message, setMessage] = useState('');
    const [templates, setTemplates] = useState([]);
    const [templateName, setTemplateName] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);

    const [scheduleMode, setScheduleMode] = useState('now');
    const [scheduledAt, setScheduledAt] = useState('');

    const [campaigns, setCampaigns] = useState([]);
    const [campaignPage, setCampaignPage] = useState(1);
    const [campaignTotal, setCampaignTotal] = useState(0);
    const [campaignSearch, setCampaignSearch] = useState('');
    const [selectedCampaign, setSelectedCampaign] = useState(null);

    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    const [error, setError] = useState('');

    const [contactsKey, setContactsKey] = useState(0);

    const charCount = message.length;
    const partCount = Math.ceil(charCount / 160) || 1;

    useEffect(() => { fetchCampaigns(); fetchTemplates(); }, []);

    async function fetchCampaigns(page = 1, search = '') {
        const r = await fetch(`${API}/api/sms/campaigns?page=${page}&per_page=10&search=${encodeURIComponent(search)}`, { headers });
        const d = await r.json();
        setCampaigns(d.data || []);
        setCampaignTotal(d.total || 0);
    }

    async function fetchTemplates() {
        const r = await fetch(`${API}/api/sms/templates`, { headers });
        const d = await r.json();
        setTemplates(d.data || []);
    }

    function insertVariable(v) { setMessage(m => m + v); }

    async function saveTemplate() {
        if (!templateName.trim() || !message.trim()) return;
        await fetch(`${API}/api/sms/templates`, {
            method: 'POST', headers,
            body: JSON.stringify({ name: templateName, content: message }),
        });
        setTemplateName('');
        fetchTemplates();
    }

    function getRecipientCount() {
        if (recipientsPayload.type === 'none') return 0;
        return recipientsPayload.data.length;
    }

    async function handleSend() {
        setError('');
        setSendResult(null);
        if (!message.trim()) { setError('Please compose a message'); return; }
        const count = getRecipientCount();
        if (!count) {
            setError(
                activeMode === 'contacts'
                    ? 'Select a contact group first'
                    : activeMode === 'upload'
                        ? 'Upload a file first'
                        : 'No recipients with phone numbers found for the selected area'
            );
            return;
        }

        let payload;
        if (activeMode === 'upload') {
            payload = { message, numbers: recipientsPayload.data, scheduled_at: scheduleMode === 'later' ? scheduledAt : null };
        } else {
            payload = { message, recipients: recipientsPayload.data, scheduled_at: scheduleMode === 'later' ? scheduledAt : null };
        }

        setSending(true);
        const r = await fetch(`${API}/api/sms/broadcast`, { method: 'POST', headers, body: JSON.stringify(payload) });
        const d = await r.json();
        setSending(false);
        if (r.ok) {
            setSendResult(d.data);
            fetchCampaigns(campaignPage, campaignSearch);
            setMessage('');
        } else {
            setError(d.error || 'Failed to send');
        }
    }

    function exportCSV() {
        const rows = [['Date', 'Message', 'Recipients', 'Sent', 'Failed', 'Status']];
        campaigns.forEach(c => rows.push([c.created_at, c.message?.slice(0, 60), c.recipient_count, c.sent_count, c.failed_count, c.status]));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Campaigns');
        XLSX.writeFile(wb, 'sms_campaigns.xlsx');
    }

    const MODES = [
        { key: 'contacts', icon: <FaUsers />, label: 'Saved Contacts' },
        { key: 'upload', icon: <FaUpload />, label: 'Upload File' },
        { key: 'database', icon: <FaDatabase />, label: 'Stations DB' },
    ];

    const recipientCount = getRecipientCount();

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                    <FaSms />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Broadcast SMS</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
                        Send personalised messages to supporters via Twilio
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                            <h3 style={{ margin: 0 }}>Recipients</h3>
                            {recipientCount > 0 && (
                                <span style={{ padding: '3px 10px', borderRadius: 99, background: 'var(--teal-light)', color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem' }}>
                                    {recipientCount.toLocaleString()} selected
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                            {MODES.map(({ key, icon, label }) => (
                                <button key={key} onClick={() => { setActiveMode(key); setRecipientsPayload({ type: 'none', data: [], label: '' }); }}
                                    style={{
                                        flex: 1, padding: '0.5rem 0.25rem', borderRadius: 8,
                                        border: `1.5px solid ${activeMode === key ? 'var(--teal)' : 'var(--color-border)'}`,
                                        background: activeMode === key ? 'var(--teal-light)' : 'transparent',
                                        color: activeMode === key ? 'var(--teal)' : 'var(--color-text-muted)',
                                        fontWeight: activeMode === key ? 700 : 400,
                                        cursor: 'pointer', fontFamily: 'inherit',
                                        display: 'flex', gap: '0.3rem', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem',
                                    }}>
                                    {icon} {label}
                                </button>
                            ))}
                        </div>

                        {activeMode === 'contacts' && (
                            <ContactsTab key={contactsKey} token={token}
                                onSelectGroup={(data, label) => setRecipientsPayload({ type: 'rich', data: data || [], label })} />
                        )}
                        {activeMode === 'upload' && (
                            <UploadTab token={token}
                                onLoadNumbers={nums => setRecipientsPayload({ type: 'plain', data: nums, label: 'Upload' })} />
                        )}
                        {activeMode === 'database' && (
                            <DatabaseTab token={token}
                                onSelectRecipients={recs => setRecipientsPayload({ type: 'rich', data: recs, label: 'Stations DB' })} />
                        )}
                    </div>

                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0 }}>Message</h3>
                            <button onClick={() => setShowTemplates(!showTemplates)}
                                style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FaFileAlt /> Templates
                            </button>
                        </div>

                        {showTemplates && (
                            <div style={{ marginBottom: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                                {templates.length === 0
                                    ? <p style={{ padding: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>No templates saved yet.</p>
                                    : templates.map(t => (
                                        <div key={t.id} onClick={() => { setMessage(t.content); setShowTemplates(false); }}
                                            style={{ padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                                            <strong style={{ display: 'block' }}>{t.name}</strong>
                                            <span style={{ color: 'var(--color-text-muted)' }}>{t.content.slice(0, 60)}…</span>
                                        </div>
                                    ))}
                            </div>
                        )}

                        <textarea className="input" rows={5} placeholder="Type your message here…"
                            value={message} onChange={e => setMessage(e.target.value)}
                            style={{ resize: 'vertical' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {['{{name}}', '{{station}}', '{{county}}'].map(v => (
                                    <button key={v} onClick={() => insertVariable(v)}
                                        style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--gray-100)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'monospace' }}>
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: charCount > 160 ? 'var(--warning)' : 'var(--color-text-muted)' }}>
                                {charCount}/160 {partCount > 1 && <span style={{ color: 'var(--warning)', fontWeight: 600 }}>({partCount} parts)</span>}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <input className="input" placeholder="Template name…" value={templateName}
                                onChange={e => setTemplateName(e.target.value)} style={{ flex: 1 }} />
                            <button onClick={saveTemplate} className="btn btn-outline btn-sm"><FaSave /> Save</button>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.25rem' }}>
                        <h3 style={{ margin: '0 0 1rem' }}>Delivery</h3>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                            {[['now', 'Send Now'], ['later', 'Schedule']].map(([m, l]) => (
                                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: scheduleMode === m ? 600 : 400 }}>
                                    <input type="radio" name="schedMode" value={m} checked={scheduleMode === m} onChange={() => setScheduleMode(m)} /> {l}
                                </label>
                            ))}
                        </div>
                        {scheduleMode === 'later' && (
                            <input type="datetime-local" className="input" style={{ marginBottom: '1rem' }}
                                value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                        )}
                        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{error}</p>}
                        {sendResult && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--teal)', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                <FaCheckCircle /> Sent! {sendResult.sent_count}/{sendResult.recipient_count} delivered.
                            </div>
                        )}
                        <button onClick={handleSend} disabled={sending} className="btn btn-primary" style={{ width: '100%' }}>
                            {sending ? 'Sending…' : <><FaPaperPlane /> {scheduleMode === 'later' ? 'Schedule Campaign' : `Send to ${recipientCount.toLocaleString()} recipients`}</>}
                        </button>
                    </div>
                </div>

                <div>
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Campaign History</h3>
                            <button onClick={exportCSV} className="btn btn-outline btn-sm"><FaDownload /> Export</button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <FaSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: '0.85rem' }} />
                                <input className="input" placeholder="Search campaigns…" value={campaignSearch} style={{ paddingLeft: '2rem' }}
                                    onChange={e => { setCampaignSearch(e.target.value); fetchCampaigns(1, e.target.value); }} />
                            </div>
                        </div>

                        {campaigns.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <FaSms style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '0.75rem' }} />
                                <p>No campaigns sent yet</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {campaigns.map(c => {
                                    const sc = STATUS_COLORS[c.status] || STATUS_COLORS.draft;
                                    const pct = c.recipient_count ? Math.round((c.sent_count / c.recipient_count) * 100) : 0;
                                    return (
                                        <div key={c.id} onClick={() => setSelectedCampaign(c)}
                                            style={{ padding: '0.875rem 1rem', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer' }}
                                            className="card-interactive">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                                                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, ...sc }}>{c.status}</span>
                                            </div>
                                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                                {c.message?.slice(0, 80)}{c.message?.length > 80 ? '…' : ''}
                                            </p>
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                <span>{c.recipient_count?.toLocaleString()} recipients</span>
                                                <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{pct}% delivered</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {campaignTotal > 10 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                <button disabled={campaignPage === 1} onClick={() => { setCampaignPage(p => p - 1); fetchCampaigns(campaignPage - 1, campaignSearch); }} className="btn btn-outline btn-sm">←</button>
                                <span style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Page {campaignPage}</span>
                                <button disabled={campaignPage * 10 >= campaignTotal} onClick={() => { setCampaignPage(p => p + 1); fetchCampaigns(campaignPage + 1, campaignSearch); }} className="btn btn-outline btn-sm">→</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedCampaign && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelectedCampaign(null)}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ width: 420, maxWidth: '100%', background: 'var(--color-surface)', height: '100%', overflowY: 'auto', padding: '2rem 1.5rem', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Campaign Details</h2>
                            <button onClick={() => setSelectedCampaign(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}><FaTimes /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label>Status</label>
                                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: '0.875rem', ...STATUS_COLORS[selectedCampaign.status] }}>
                                    {selectedCampaign.status}
                                </span>
                            </div>
                            <div>
                                <label>Message</label>
                                <div style={{ padding: '0.75rem', background: 'var(--gray-100)', borderRadius: 8, fontSize: '0.9rem', lineHeight: 1.6 }}>
                                    {selectedCampaign.message}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                {[['Recipients', selectedCampaign.recipient_count, '#333'], ['Delivered', selectedCampaign.sent_count, 'var(--teal)'], ['Failed', selectedCampaign.failed_count, 'var(--danger)']].map(([label, val, color]) => (
                                    <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-surface-alt)', borderRadius: 8 }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{val || 0}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{label}</div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label>Delivery Rate</label>
                                <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${selectedCampaign.recipient_count ? (selectedCampaign.sent_count / selectedCampaign.recipient_count) * 100 : 0}%`,
                                        background: 'var(--teal)', borderRadius: 99, transition: 'width 0.6s ease',
                                    }} />
                                </div>
                            </div>
                            {selectedCampaign.scheduled_at && <div><label>Scheduled For</label><p style={{ margin: 0 }}>{new Date(selectedCampaign.scheduled_at).toLocaleString()}</p></div>}
                            {selectedCampaign.sent_at && <div><label>Sent At</label><p style={{ margin: 0 }}>{new Date(selectedCampaign.sent_at).toLocaleString()}</p></div>}

                            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                                <button
                                    className="btn btn-outline"
                                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)', width: '100%' }}
                                    onClick={async () => {
                                        if (!window.confirm("Are you sure you want to delete this campaign?")) return;
                                        await fetch(`${API}/api/sms/campaigns/${selectedCampaign.id}`, { method: 'DELETE', headers });
                                        setSelectedCampaign(null);
                                        fetchCampaigns(campaignPage, campaignSearch);
                                    }}
                                >
                                    <FaTrash /> Delete Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SMSBroadcast;
