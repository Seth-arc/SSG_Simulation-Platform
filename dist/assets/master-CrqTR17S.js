import{c as O,s as R,a as u,n as z,g as V,k as J,e as b,d as M,h as T,O as W}from"./main-ZaVdu2y6.js";import{s as Q,c as Y,a as K}from"./Modal-O3kyaPUL.js";import{c as x,f as S}from"./formatting-ComEAAKd.js";import{v as X}from"./validation-Dz-X4E40.js";import"./supabase-BQbgwcOn.js";function Z({session:i=null,gameState:e=null,actions:t=[],requests:s=[],timeline:n=[],participants:a=[],exportedAt:r=new Date().toISOString(),version:d="2.0.0"}={}){return{exportedAt:r,version:d,session:i,gameState:e,actions:t,requests:s,timeline:n,participants:a}}function ee(i,e="esg-export.json"){const t=JSON.stringify(i,null,2),s=new Blob([t],{type:"application/json"}),n=URL.createObjectURL(s),a=document.createElement("a");a.href=n,a.download=e,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(n)}function A(i,e){if(!i||i.length===0)return e.join(",");const t=e.join(","),s=i.map(n=>e.map(a=>{const r=n[a];if(r==null)return"";if(Array.isArray(r))return`"${r.join("; ").replace(/"/g,'""')}"`;if(typeof r=="object")return`"${JSON.stringify(r).replace(/"/g,'""')}"`;const d=String(r);return d.includes(",")||d.includes(`
`)||d.includes('"')?`"${d.replace(/"/g,'""')}"`:d}).join(","));return[t,...s].join(`
`)}function te(i=[]){return A(i,["id","team","move","phase","mechanism","sector","exposure_type","targets","goal","expected_outcomes","ally_contingencies","priority","status","outcome","adjudication_notes","created_at","submitted_at","adjudicated_at","updated_at"])}function se(i=[]){return A(i,["id","team","move","phase","priority","categories","query","status","response","responded_by","responded_at","created_at"])}function ne(i=[]){return A(i,["id","type","team","move","phase","category","content","faction_tag","debate_marker","created_at"])}function ie(i=[]){return A(i,["id","display_name","role","is_active","joined_at","heartbeat_at","disconnected_at","client_id"])}function C(i,e){const t=new Blob([i],{type:"text/csv;charset=utf-8;"}),s=URL.createObjectURL(t),n=document.createElement("a");n.href=s,n.download=e,document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(s)}function l(i=""){return String(i).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function k(i,e){const t=String(i??"");return t.length<=e?t:`${t.substring(0,e)}...`}function ae({session:i=null,gameState:e=null,actions:t=[],requests:s=[],timeline:n=[],participants:a=[],title:r="ESG Simulation Report",includeActions:d=!0,includeRequests:c=!0,includeTimeline:m=!0,includeParticipants:g=!0,includeSummary:v=!0}={}){var D;const $=(i==null?void 0:i.name)||"Unknown Session",f=((D=i==null?void 0:i.metadata)==null?void 0:D.session_code)||"N/A";let p=`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${r}</title>
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
    <h1>${r}</h1>
    <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
`;if(v){const o=(e==null?void 0:e.move)??"N/A",y=(e==null?void 0:e.phase)??"N/A";p+=`
    <div class="summary-box section">
        <h2>Game Summary</h2>
        <p><strong>Session:</strong> ${l($)}</p>
        <p><strong>Session Code:</strong> ${l(f)}</p>
        <p><strong>Current Move:</strong> ${o}</p>
        <p><strong>Current Phase:</strong> ${y}</p>
        <p><strong>Status:</strong> ${(e==null?void 0:e.status)||"N/A"}</p>
        <p><strong>Total Actions:</strong> ${t.length}</p>
        <p><strong>Total RFIs:</strong> ${s.length}</p>
        <p><strong>Active Participants:</strong> ${a.length}</p>
        <p><strong>Timeline Events:</strong> ${n.length}</p>
    </div>
`}return d&&t.length>0&&(p+=`
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
`,t.forEach(o=>{const y=`status-${o.status}`,L=o.team||o.team_id||"N/A",_=o.move??o.move_number??"N/A",I=o.mechanism||o.action_type||"N/A",B=o.goal||o.title||"",w=Array.isArray(o.targets)?o.targets.join(", "):o.target||"N/A",U=o.exposure_type||"N/A",F=o.priority||"NORMAL",G=o.outcome||o.adjudication_outcome||"-";p+=`
                <tr>
                    <td>${l(L)}</td>
                    <td>${_}</td>
                    <td>${l(I)}</td>
                    <td>${l(k(B,80))}</td>
                    <td>${l(k(w,60))}</td>
                    <td>${l(U)}</td>
                    <td>${l(F)}</td>
                    <td class="${y}">${l(o.status||"pending")}</td>
                    <td>${l(G)}</td>
                </tr>
`}),p+=`
            </tbody>
        </table>
    </div>
`),c&&s.length>0&&(p+=`
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
`,s.forEach(o=>{const y=`status-${o.status}`;p+=`
                <tr>
                    <td>${l(o.team||o.team_id||"N/A")}</td>
                    <td>${o.move||o.move_number||"N/A"}</td>
                    <td>${l(k(o.query||o.question||"",100))}</td>
                    <td>${l(o.priority||"normal")}</td>
                    <td class="${y}">${l(o.status||"pending")}</td>
                </tr>
`}),p+=`
            </tbody>
        </table>
    </div>
`),g&&a.length>0&&(p+=`
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
`,a.forEach(o=>{p+=`
                <tr>
                    <td>${l(o.display_name||"Unknown")}</td>
                    <td>${l(o.role||"N/A")}</td>
                    <td>${o.is_active?"Active":"Inactive"}</td>
                    <td>${l(o.heartbeat_at||o.joined_at||"N/A")}</td>
                </tr>
`}),p+=`
            </tbody>
        </table>
    </div>
`),m&&n.length>0&&(p+=`
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
`,n.forEach(o=>{var w;const y=o.created_at?new Date(o.created_at).toLocaleTimeString():"N/A",L=o.move??o.move_number??"N/A",_=o.type||o.event_type||"N/A",I=o.content||o.description||o.title||"",B=o.actor||o.actor_name||((w=o.metadata)==null?void 0:w.actor)||"";p+=`
                <tr>
                    <td class="timestamp">${y}</td>
                    <td>${L}</td>
                    <td>${_}</td>
                    <td>${l(I)}</td>
                    <td>${l(B)}</td>
                </tr>
`}),p+=`
            </tbody>
        </table>
    </div>
`),p+=`
</body>
</html>
`,p}function oe(i={},e={}){const t=ae({...i,...e}),s=window.open("","_blank");s.document.write(t),s.document.close()}const h=O("GameMaster");function E(i){return i?new Date(i).getTime():0}function H(i="session"){return String(i).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"session"}function re(i){return{session:i,gameState:null,participants:[],actions:[],requests:[],timeline:[]}}function ce(i=R){var s,n,a,r;const e=((s=i.getRole)==null?void 0:s.call(i))||((a=(n=i.getSessionData)==null?void 0:n.call(i))==null?void 0:a.role)||null;return{allowed:e==="white"&&((r=i.hasOperatorAccess)==null?void 0:r.call(i,W.GAME_MASTER,{role:"white"})),role:e}}function j(i=[]){return{activeSessions:i.length,totalParticipants:i.reduce((e,t)=>{var s;return e+(((s=t.participants)==null?void 0:s.length)||0)},0),totalActions:i.reduce((e,t)=>{var s;return e+(((s=t.actions)==null?void 0:s.length)||0)},0),pendingRequests:i.reduce((e,t)=>{var s;return e+(((s=t.requests)==null?void 0:s.filter(n=>n.status==="pending").length)||0)},0)}}function de(i=[],e=8){return i.flatMap(t=>(t.timeline||[]).map(s=>{var n,a;return{...s,sessionId:((n=t.session)==null?void 0:n.id)||null,sessionName:((a=t.session)==null?void 0:a.name)||"Unknown Session"}})).sort((t,s)=>E(s.created_at)-E(t.created_at)).slice(0,e)}function le(i=[],e=10){return i.flatMap(t=>(t.participants||[]).map(s=>{var n,a;return{...s,sessionId:((n=t.session)==null?void 0:n.id)||null,sessionName:((a=t.session)==null?void 0:a.name)||"Unknown Session"}})).sort((t,s)=>E(s.heartbeat_at||s.joined_at)-E(t.heartbeat_at||t.joined_at)).slice(0,e)}function N({supportsPdf:i=!0}={}){const e=[{id:"exportJsonBtn",action:"json",successLabel:"JSON"},{id:"exportActionsCsvBtn",action:"csv-actions",successLabel:"Actions CSV"},{id:"exportRequestsCsvBtn",action:"csv-requests",successLabel:"RFIs CSV"},{id:"exportTimelineCsvBtn",action:"csv-timeline",successLabel:"Timeline CSV"},{id:"exportParticipantsCsvBtn",action:"csv-participants",successLabel:"Participants CSV"}];return i&&e.push({id:"exportPdfBtn",action:"pdf",successLabel:"Print view"}),e}function pe(i=null){return i!=null&&i.session?{disabled:!1,message:`Exporting data for ${i.session.name}.`}:{disabled:!0,message:"Select a session before exporting data."}}class ue{constructor(){this.sessions=[],this.currentSessionId=null,this.refreshInterval=null,this.sessionBundles=new Map}async init(){if(h.info("Initializing Game Master interface"),!ce(R).allowed){h.warn("Blocked direct Game Master access without operator auth"),u("Game Master access requires operator authorization from the landing page.",{type:"error"}),z("index.html#operatorAccessSection",{replace:!0});return}if(!V().ready){h.error("Game Master page blocked: backend configuration is missing");return}this.bindEventListeners(),await this.loadSessions(),this.startAutoRefresh(),h.info("Game Master interface initialized")}bindEventListeners(){const e=document.getElementById("createSessionBtn");e&&e.addEventListener("click",()=>this.showCreateSessionModal());const t=document.getElementById("refreshDashboardBtn");t&&t.addEventListener("click",()=>this.loadSessions());const s=document.getElementById("participantsSessionSelect");s&&s.addEventListener("change",a=>{this.handleSessionSelectionChange(a.target.value)});const n=document.getElementById("exportSessionSelect");n&&n.addEventListener("change",a=>{this.handleSessionSelectionChange(a.target.value)}),N().forEach(({id:a,action:r})=>{const d=document.getElementById(a);d&&d.addEventListener("click",()=>{this.exportData(r)})})}async loadSessions(){const e=document.getElementById("sessionsList"),t=e?J(e,{message:"Loading sessions...",replace:!1}):null;try{if(this.sessions=await b.getActiveSessions()||[],t&&t.hide(),this.currentSessionId&&!this.sessions.some(s=>s.id===this.currentSessionId)){this.currentSessionId=null;const s=document.getElementById("sessionDetailSection"),n=document.getElementById("sessionsSection");s&&(s.style.display="none"),n&&(n.style.display="block")}this.renderSessionsList(),this.renderSessionSelectors(),await this.loadDashboardData(),await this.refreshSelectedSessionViews(),h.info(`Loaded ${this.sessions.length} sessions`)}catch(s){h.error("Failed to load sessions:",s),u("Failed to load sessions",{type:"error"}),t&&t.hide()}}async loadDashboardData(){if(this.sessions.length===0){this.sessionBundles=new Map,this.renderDashboardStats(j([])),this.renderRecentActivity([]),this.renderActiveParticipants([]);return}const e=await Promise.all(this.sessions.map(async t=>{try{return await b.fetchSessionBundle(t.id)}catch(s){return h.error("Failed to load session bundle for dashboard:",t.id,s),re(t)}}));this.sessionBundles=new Map(e.map(t=>[t.session.id,t])),this.renderDashboardStats(j(e)),this.renderRecentActivity(de(e)),this.renderActiveParticipants(le(e))}async handleSessionSelectionChange(e){this.currentSessionId=e||null,await this.refreshSelectedSessionViews(),this.renderSessionsList()}async ensureSessionBundle(e){if(!e)return null;const t=this.sessionBundles.get(e);if(t)return t;const s=await b.fetchSessionBundle(e);return this.sessionBundles.set(e,s),s}async refreshSelectedSessionViews(){if(this.renderSessionSelectors(),!this.currentSessionId){this.updateHeaderSessionState(null,null),this.renderParticipantsPanel(null),this.updateExportAvailability(null);return}try{const e=await this.ensureSessionBundle(this.currentSessionId);this.updateHeaderSessionState(e.session,e.gameState),this.renderParticipantsPanel(e),this.updateExportAvailability(e);const t=document.getElementById("sessionDetailSection");(t==null?void 0:t.style.display)!=="none"&&this.renderSessionDetails(e.session,e.participants,e.gameState,e.actions,e.requests)}catch(e){h.error("Failed to refresh selected session views:",e),u("Failed to refresh selected session views",{type:"error"})}}updateHeaderSessionState(e,t){const s=document.getElementById("sessionName"),n=document.getElementById("headerMove"),a=document.getElementById("headerPhase");s&&(s.textContent=e?e.name:"No Session Selected"),n&&(n.textContent=(t==null?void 0:t.move)??"-"),a&&(a.textContent=(t==null?void 0:t.phase)??"-")}renderSessionSelectors(){["participantsSessionSelect","exportSessionSelect"].forEach(e=>{const t=document.getElementById(e);if(!t)return;const s=this.currentSessionId||"";t.innerHTML=`
                <option value="">Select session</option>
                ${this.sessions.map(n=>{var r;const a=((r=n.metadata)==null?void 0:r.session_code)||"N/A";return`<option value="${n.id}">${this.escapeHtml(n.name)} (${a})</option>`}).join("")}
            `,t.value=this.sessions.some(n=>n.id===s)?s:""})}renderDashboardStats(e){const t=document.getElementById("statsGrid");t&&(t.innerHTML=`
            <div class="card stat-card">
                <span class="stat-label">Active Sessions</span>
                <span class="stat-value">${e.activeSessions}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Active Participants</span>
                <span class="stat-value">${e.totalParticipants}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Actions Logged</span>
                <span class="stat-value">${e.totalActions}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Pending RFIs</span>
                <span class="stat-value">${e.pendingRequests}</span>
            </div>
        `)}renderRecentActivity(e){const t=document.getElementById("recentActivity");if(t){if(!e.length){t.innerHTML=`
                <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
                    No recent activity recorded.
                </div>
            `;return}t.innerHTML=e.map(s=>`
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                        <div style="display: flex; gap: var(--space-2); align-items: center;">
                            ${x({text:s.type||"EVENT",variant:"info",size:"sm"}).outerHTML}
                            <span class="text-sm font-semibold">${this.escapeHtml(s.sessionName)}</span>
                        </div>
                        <span class="text-xs text-gray-500">${S(s.created_at)}</span>
                    </div>
                    <p class="text-sm">${this.escapeHtml(s.content||"No content provided")}</p>
                </div>
            `).join("")}}renderActiveParticipants(e){const t=document.getElementById("activeParticipants");if(t){if(!e.length){t.innerHTML=`
                <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
                    Waiting for connections...
                </div>
            `;return}t.innerHTML=e.map(s=>{const n=x({text:s.role||"unknown",variant:"primary",size:"sm"});return`
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                        <div>
                            <p class="text-sm font-semibold">${this.escapeHtml(s.display_name||"Unknown")}</p>
                            <p class="text-xs text-gray-500">${this.escapeHtml(s.sessionName)}</p>
                        </div>
                        ${n.outerHTML}
                    </div>
                    <p class="text-xs text-gray-500">Last active ${S(s.heartbeat_at||s.joined_at)}</p>
                </div>
            `}).join("")}}renderSessionsList(){const e=document.getElementById("sessionsList");if(e){if(this.sessions.length===0){e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No Sessions</h3>
                    <p class="empty-state-message">Create your first session to get started</p>
                </div>
            `;return}e.innerHTML=this.sessions.map(t=>this.renderSessionCard(t)).join(""),this.sessions.forEach(t=>{const s=e.querySelector(`[data-session-id="${t.id}"]`);if(!s)return;const n=s.querySelector(".view-session-btn"),a=s.querySelector(".select-session-btn"),r=s.querySelector(".delete-session-btn");n&&n.addEventListener("click",()=>{this.viewSession(t.id)}),a&&a.addEventListener("click",()=>{this.handleSessionSelectionChange(t.id)}),r&&r.addEventListener("click",()=>{this.confirmDeleteSession(t.id)})})}}renderSessionCard(e){var r;const t=this.currentSessionId===e.id,s=x({text:e.status||"active",variant:e.status==="active"?"success":"default",size:"sm"}),n=t?x({text:"Selected",variant:"primary",size:"sm"}).outerHTML:"",a=((r=e.metadata)==null?void 0:r.session_code)||"N/A";return`
            <div class="session-card card card-bordered card-hoverable" data-session-id="${e.id}">
                <div class="session-card-header">
                    <div class="session-card-title-group">
                        <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
                            <h3 class="card-title">${this.escapeHtml(e.name)}</h3>
                            ${n}
                        </div>
                        <p class="card-subtitle">Code: <strong>${this.escapeHtml(a)}</strong></p>
                    </div>
                    ${s.outerHTML}
                </div>
                <div class="session-card-body">
                    <div class="session-meta">
                        <div class="session-meta-item">
                            <span class="session-meta-label">Status</span>
                            <span class="session-meta-value">${this.escapeHtml(e.status||"active")}</span>
                        </div>
                        <div class="session-meta-item">
                            <span class="session-meta-label">Created</span>
                            <span class="session-meta-value">${S(e.created_at)}</span>
                        </div>
                        <div class="session-meta-item">
                            <span class="session-meta-label">Updated</span>
                            <span class="session-meta-value">${S(e.updated_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="session-card-actions">
                    <button class="btn btn-outline btn-sm select-session-btn">Select</button>
                    <button class="btn btn-primary btn-sm view-session-btn">View Details</button>
                    <button class="btn btn-danger btn-sm delete-session-btn">Delete</button>
                </div>
            </div>
        `}showCreateSessionModal(){const e=document.createElement("div");e.innerHTML=`
            <form id="createSessionForm">
                <div class="form-group">
                    <label class="form-label" for="sessionName">Session Name *</label>
                    <input type="text" id="sessionName" class="form-input" placeholder="e.g., Training Exercise Alpha" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="sessionCode">Session Code *</label>
                    <input type="text" id="sessionCode" class="form-input" placeholder="e.g., ALPHA2024" maxlength="20" required>
                    <p class="form-hint">Alphanumeric, 4-20 characters. Participants use this to join.</p>
                </div>
                <div class="form-group">
                    <label class="form-label" for="sessionDescription">Description</label>
                    <textarea id="sessionDescription" class="form-input form-textarea" rows="3" placeholder="Optional description..."></textarea>
                </div>
            </form>
        `;const t={current:null};t.current=Q({title:"Create New Session",content:e,size:"md",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Create Session",variant:"primary",onClick:()=>(this.handleCreateSession(t.current),!1)}]})}async handleCreateSession(e){var d,c;const t=(e==null?void 0:e.element)||document,s=t.querySelector("#sessionName")||document.getElementById("sessionName"),n=t.querySelector("#sessionCode")||document.getElementById("sessionCode"),a=t.querySelector("#sessionDescription")||document.getElementById("sessionDescription");if(!((d=s==null?void 0:s.value)!=null&&d.trim())){u("Session name is required",{type:"error"}),s==null||s.focus();return}const r=X((n==null?void 0:n.value)||"");if(r){u(r,{type:"error"}),n==null||n.focus();return}M({message:"Creating session..."});try{const m={name:s.value.trim(),session_code:n.value.trim().toUpperCase(),description:((c=a==null?void 0:a.value)==null?void 0:c.trim())||null,status:"active",move:1,phase:1},g=await b.createSession(m);u("Session created successfully",{type:"success"}),e&&typeof e.close=="function"?e.close():Y(),this.currentSessionId=g.id,await this.loadSessions()}catch(m){h.error("Failed to create session:",m),u(m.message||"Failed to create session",{type:"error"})}finally{T()}}async viewSession(e){this.currentSessionId=e;const t=document.getElementById("sessionsSection"),s=document.getElementById("sessionDetailSection");t&&(t.style.display="none"),s&&(s.style.display="block"),this.renderSessionsList(),await this.refreshSelectedSessionViews()}renderSessionDetails(e,t,s,n=[],a=[]){var $;const r=document.getElementById("sessionDetailContent");if(!r)return;const d=(($=e.metadata)==null?void 0:$.session_code)||"N/A",c=(s==null?void 0:s.move)??1,m=(s==null?void 0:s.phase)??1,g=a.filter(f=>f.status==="pending").length;r.innerHTML=`
            <div class="session-detail-header" style="margin-bottom: var(--space-6);">
                <button class="btn btn-ghost btn-sm" id="backToListBtn">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width: 1em; height: 1em;">
                        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
                    </svg>
                    Back to Sessions
                </button>
                <h2 class="section-title" style="margin-top: var(--space-3);">${this.escapeHtml(e.name)}</h2>
                <p class="text-gray-500">Code: <strong>${this.escapeHtml(d)}</strong></p>
            </div>

            <div class="section-grid section-grid-4" style="margin-bottom: var(--space-6);">
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Current Move</h4>
                    <p class="text-2xl font-bold">${c}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Current Phase</h4>
                    <p class="text-2xl font-bold">${m}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Participants</h4>
                    <p class="text-2xl font-bold">${t.length}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Pending RFIs</h4>
                    <p class="text-2xl font-bold">${g}</p>
                </div>
            </div>

            <div class="card card-bordered" style="padding: var(--space-4);">
                <h3 class="text-base font-semibold mb-4">Participants</h3>
                <div id="participantsListDetail">
                    ${this.renderParticipantsTable(t)}
                </div>
            </div>

            <div class="card card-bordered" style="padding: var(--space-4); margin-top: var(--space-4);">
                <h3 class="text-base font-semibold mb-4">Session Activity Summary</h3>
                <div class="section-grid section-grid-3">
                    <div>
                        <p class="text-sm text-gray-500">Actions</p>
                        <p class="text-xl font-semibold">${n.length}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">RFIs</p>
                        <p class="text-xl font-semibold">${a.length}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Last Updated</p>
                        <p class="text-sm">${S(e.updated_at)}</p>
                    </div>
                </div>
            </div>
        `;const v=r.querySelector("#backToListBtn");v&&v.addEventListener("click",()=>{const f=document.getElementById("sessionsSection"),p=document.getElementById("sessionDetailSection");f&&(f.style.display="block"),p&&(p.style.display="none")})}renderParticipantsTable(e){return e.length?`
            <table class="table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Active</th>
                    </tr>
                </thead>
                <tbody>
                    ${e.map(t=>{const s=x({text:t.is_active?"Active":"Inactive",variant:t.is_active?"success":"default",size:"sm"});return`
                            <tr>
                                <td>${this.escapeHtml(t.display_name||"Unknown")}</td>
                                <td>${this.escapeHtml(t.role||"Unknown")}</td>
                                <td>${s.outerHTML}</td>
                                <td>${t.heartbeat_at?S(t.heartbeat_at):"Never"}</td>
                            </tr>
                        `}).join("")}
                </tbody>
            </table>
        `:'<p class="text-muted">No participants have joined yet.</p>'}renderParticipantsPanel(e){var n;const t=document.getElementById("participantsSelectionState"),s=document.getElementById("participantsList");if(!(!t||!s)){if(!(e!=null&&e.session)){t.textContent="Select a session from Session Management to view participants.",s.style.display="flex",s.style.alignItems="center",s.style.justifyContent="center",s.style.minHeight="200px",s.innerHTML=`
                <p class="text-gray-500">Select a session from the Session Management tab to view participants</p>
            `;return}t.textContent=`Showing participants for ${e.session.name}.`,s.style.display="block",s.style.minHeight="auto",s.innerHTML=`
            <div style="padding: var(--space-4);">
                <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-4);">
                    <div>
                        <h3 class="text-base font-semibold">${this.escapeHtml(e.session.name)}</h3>
                        <p class="text-sm text-gray-500">Code ${this.escapeHtml(((n=e.session.metadata)==null?void 0:n.session_code)||"N/A")}</p>
                    </div>
                    <span class="text-sm text-gray-500">${e.participants.length} active participants</span>
                </div>
                ${this.renderParticipantsTable(e.participants)}
            </div>
        `}}updateExportAvailability(e){const t=pe(e),s=document.getElementById("exportSelectionState");s&&(s.textContent=t.message),N().forEach(({id:n})=>{const a=document.getElementById(n);a&&(a.disabled=t.disabled)})}async confirmDeleteSession(e){const t=this.sessions.find(n=>n.id===e);if(!t)return;await K({title:"Delete Session",message:`Are you sure you want to delete "${t.name}"? This action cannot be undone and all associated data will be permanently deleted.`})&&await this.deleteSession(e)}async deleteSession(e){M({message:"Deleting session..."});try{await b.deleteSession(e),this.sessionBundles.delete(e),this.currentSessionId===e&&(this.currentSessionId=null),u("Session deleted successfully",{type:"success"}),await this.loadSessions()}catch(t){h.error("Failed to delete session:",t),u("Failed to delete session",{type:"error"})}finally{T()}}async exportData(e){var s,n,a,r,d;if(!this.currentSessionId){u("Select a session before exporting.",{type:"warning"});return}const t=N().find(c=>c.action===e);if(!t){u("Unsupported export action.",{type:"error"});return}M({message:"Preparing export..."});try{const c=await b.fetchSessionBundle(this.currentSessionId);this.sessionBundles.set(this.currentSessionId,c);const m=H(((s=c.session)==null?void 0:s.name)||this.currentSessionId),g=H(((a=(n=c.session)==null?void 0:n.metadata)==null?void 0:a.session_code)||((r=c.session)==null?void 0:r.id)||"session"),v=`esg-${m}-${g}`;switch(e){case"json":ee(Z(c),`${v}.json`);break;case"csv-actions":C(te(c.actions),`${v}-actions.csv`);break;case"csv-requests":C(se(c.requests),`${v}-rfis.csv`);break;case"csv-timeline":C(ne(c.timeline),`${v}-timeline.csv`);break;case"csv-participants":C(ie(c.participants),`${v}-participants.csv`);break;case"pdf":oe(c,{title:`ESG Session Report: ${((d=c.session)==null?void 0:d.name)||"Session"}`,includeParticipants:!0});break;default:throw new Error(`Unhandled export action: ${e}`)}u(`${t.successLabel} export is ready.`,{type:"success"})}catch(c){h.error("Export failed:",c),u("Export failed",{type:"error"})}finally{T()}}startAutoRefresh(){this.refreshInterval=setInterval(()=>{this.loadSessions()},6e4)}stopAutoRefresh(){this.refreshInterval&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}escapeHtml(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}destroy(){this.stopAutoRefresh()}}const P=new ue,q=typeof document<"u"&&!globalThis.__ESG_DISABLE_AUTO_INIT__;q&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{P.init()}):P.init());typeof window<"u"&&q&&window.addEventListener("beforeunload",()=>P.destroy());
//# sourceMappingURL=master-CrqTR17S.js.map
