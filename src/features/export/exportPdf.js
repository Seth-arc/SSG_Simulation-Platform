/**
 * PDF Export Utility
 * Generates printable HTML for PDF export (print to PDF)
 */

import { actionsStore, requestsStore, timelineStore, gameStateStore } from '../../stores/index.js';

function escapeHtml(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function truncate(text, maxLength) {
    const value = String(text ?? '');
    if (value.length <= maxLength) return value;
    return `${value.substring(0, maxLength)}...`;
}

export function generatePrintableReportFromData({
    session = null,
    gameState = null,
    actions = [],
    requests = [],
    timeline = [],
    participants = [],
    title = 'ESG Simulation Report',
    includeActions = true,
    includeRequests = true,
    includeTimeline = true,
    includeParticipants = true,
    includeSummary = true
} = {}) {
    const sessionName = session?.name || 'Unknown Session';
    const sessionCode = session?.metadata?.session_code || 'N/A';

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
        h2 { color: #2c5282; margin-top: 30px; }
        h3 { color: #2b6cb0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
        th { background: #edf2f7; font-weight: 600; }
        tr:nth-child(even) { background: #f7fafc; }
        .summary-box { background: #ebf8ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .status-pending { color: #d69e2e; }
        .status-approved { color: #38a169; }
        .status-rejected { color: #e53e3e; }
        .status-modified { color: #3182ce; }
        .timestamp { color: #718096; font-size: 0.9em; }
        .section { page-break-inside: avoid; }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
`;

    if (includeSummary) {
        const currentMove = gameState?.move ?? 'N/A';
        const currentPhase = gameState?.phase ?? 'N/A';
        html += `
    <div class="summary-box section">
        <h2>Game Summary</h2>
        <p><strong>Session:</strong> ${escapeHtml(sessionName)}</p>
        <p><strong>Session Code:</strong> ${escapeHtml(sessionCode)}</p>
        <p><strong>Current Move:</strong> ${currentMove}</p>
        <p><strong>Current Phase:</strong> ${currentPhase}</p>
        <p><strong>Status:</strong> ${gameState?.status || 'N/A'}</p>
        <p><strong>Total Actions:</strong> ${actions.length}</p>
        <p><strong>Total RFIs:</strong> ${requests.length}</p>
        <p><strong>Active Participants:</strong> ${participants.length}</p>
        <p><strong>Timeline Events:</strong> ${timeline.length}</p>
    </div>
`;
    }

    if (includeActions && actions.length > 0) {
        html += `
    <div class="section">
        <h2>Actions</h2>
        <table>
            <thead>
                <tr>
                    <th>Team</th>
                    <th>Move</th>
                    <th>Mechanism</th>
                    <th>Goal</th>
                    <th>Targets</th>
                    <th>Exposure</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Outcome</th>
                </tr>
            </thead>
            <tbody>
`;
        actions.forEach(action => {
            const statusClass = `status-${action.status}`;
            const team = action.team || action.team_id || 'N/A';
            const move = action.move ?? action.move_number ?? 'N/A';
            const mechanism = action.mechanism || action.action_type || 'N/A';
            const goal = action.goal || action.title || '';
            const targets = Array.isArray(action.targets)
                ? action.targets.join(', ')
                : (action.target || 'N/A');
            const exposure = action.exposure_type || 'N/A';
            const priority = action.priority || 'NORMAL';
            const outcome = action.outcome || action.adjudication_outcome || '-';
            html += `
                <tr>
                    <td>${escapeHtml(team)}</td>
                    <td>${move}</td>
                    <td>${escapeHtml(mechanism)}</td>
                    <td>${escapeHtml(truncate(goal, 80))}</td>
                    <td>${escapeHtml(truncate(targets, 60))}</td>
                    <td>${escapeHtml(exposure)}</td>
                    <td>${escapeHtml(priority)}</td>
                    <td class="${statusClass}">${escapeHtml(action.status || 'pending')}</td>
                    <td>${escapeHtml(outcome)}</td>
                </tr>
`;
        });
        html += `
            </tbody>
        </table>
    </div>
`;
    }

    if (includeRequests && requests.length > 0) {
        html += `
    <div class="section">
        <h2>Requests for Information (RFIs)</h2>
        <table>
            <thead>
                <tr>
                    <th>Team</th>
                    <th>Move</th>
                    <th>Question</th>
                    <th>Priority</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
`;
        requests.forEach(rfi => {
            const statusClass = `status-${rfi.status}`;
            html += `
                <tr>
                    <td>${escapeHtml(rfi.team || rfi.team_id || 'N/A')}</td>
                    <td>${rfi.move || rfi.move_number || 'N/A'}</td>
                    <td>${escapeHtml(truncate(rfi.query || rfi.question || '', 100))}</td>
                    <td>${escapeHtml(rfi.priority || 'normal')}</td>
                    <td class="${statusClass}">${escapeHtml(rfi.status || 'pending')}</td>
                </tr>
`;
        });
        html += `
            </tbody>
        </table>
    </div>
`;
    }

    if (includeParticipants && participants.length > 0) {
        html += `
    <div class="section">
        <h2>Participants</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Active</th>
                </tr>
            </thead>
            <tbody>
`;
        participants.forEach((participant) => {
            html += `
                <tr>
                    <td>${escapeHtml(participant.display_name || 'Unknown')}</td>
                    <td>${escapeHtml(participant.role || 'N/A')}</td>
                    <td>${participant.is_active ? 'Active' : 'Inactive'}</td>
                    <td>${escapeHtml(participant.heartbeat_at || participant.joined_at || 'N/A')}</td>
                </tr>
`;
        });
        html += `
            </tbody>
        </table>
    </div>
`;
    }

    if (includeTimeline && timeline.length > 0) {
        html += `
    <div class="section">
        <h2>Timeline</h2>
        <table>
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Move</th>
                    <th>Type</th>
                    <th>Event</th>
                    <th>Actor</th>
                </tr>
            </thead>
            <tbody>
`;
        timeline.forEach(event => {
            const time = event.created_at ? new Date(event.created_at).toLocaleTimeString() : 'N/A';
            const move = event.move ?? event.move_number ?? 'N/A';
            const eventType = event.type || event.event_type || 'N/A';
            const eventContent = event.content || event.description || event.title || '';
            const eventActor = event.actor || event.actor_name || event.metadata?.actor || '';
            html += `
                <tr>
                    <td class="timestamp">${time}</td>
                    <td>${move}</td>
                    <td>${eventType}</td>
                    <td>${escapeHtml(eventContent)}</td>
                    <td>${escapeHtml(eventActor)}</td>
                </tr>
`;
        });
        html += `
            </tbody>
        </table>
    </div>
`;
    }

    html += `
</body>
</html>
`;

    return html;
}

/**
 * Generate printable HTML report from store-backed data
 * @param {Object} options - Export options
 * @returns {string} HTML string
 */
export function generatePrintableReport(options = {}) {
    return generatePrintableReportFromData({
        gameState: gameStateStore.getState(),
        actions: actionsStore.getAll(),
        requests: requestsStore.getAll(),
        timeline: timelineStore.getAll(),
        ...options
    });
}

/**
 * Open printable report in new window
 * @param {Object} data - Export data
 * @param {Object} options - Export options
 */
export function openPrintableReportFromData(data = {}, options = {}) {
    const html = generatePrintableReportFromData({
        ...data,
        ...options
    });
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
}

/**
 * Open printable report in new window from store-backed data
 * @param {Object} options - Export options
 */
export function openPrintableReport(options = {}) {
    openPrintableReportFromData({}, options);
}

/**
 * Trigger print dialog for report
 * @param {Object} data - Export data
 * @param {Object} options - Export options
 */
export function printReportFromData(data = {}, options = {}) {
    const html = generatePrintableReportFromData({
        ...data,
        ...options
    });
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.print();
    };
}

/**
 * Trigger print dialog for store-backed report
 * @param {Object} options - Export options
 */
export function printReport(options = {}) {
    printReportFromData({}, options);
}
