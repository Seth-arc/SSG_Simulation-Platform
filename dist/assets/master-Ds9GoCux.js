import{c as z,s as g,a as c,n as M,f as m,O,g as G,o as V,h as H,q as T,r as D,t as k,u as P,v as j,d as x,j as w}from"./main-Sna_XDJf.js";import{s as J,c as K,a as Q}from"./Modal-O3kyaPUL.js";import{c as v,f as h}from"./formatting-BZ3CiXq9.js";import{v as W}from"./validation-D4C6BZfP.js";import"./supabase-BQbgwcOn.js";function X({session:i=null,gameState:e=null,actions:t=[],requests:s=[],timeline:n=[],participants:a=[],exportedAt:r=new Date().toISOString(),version:o="2.0.0"}={}){return{exportedAt:r,version:o,session:i,gameState:e,actions:t,requests:s,timeline:n,participants:a}}function Y(i,e="esg-export.json"){const t=JSON.stringify(i,null,2),s=new Blob([t],{type:"application/json"}),n=URL.createObjectURL(s),a=document.createElement("a");a.href=n,a.download=e,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(n)}function S(i,e){if(!i||i.length===0)return e.join(",");const t=e.join(","),s=i.map(n=>e.map(a=>{const r=n[a];if(r==null)return"";if(Array.isArray(r))return`"${r.join("; ").replace(/"/g,'""')}"`;if(typeof r=="object")return`"${JSON.stringify(r).replace(/"/g,'""')}"`;const o=String(r);return o.includes(",")||o.includes(`
`)||o.includes('"')?`"${o.replace(/"/g,'""')}"`:o}).join(","));return[t,...s].join(`
`)}function Z(i=[]){return S(i,["id","team","move","phase","mechanism","sector","exposure_type","targets","goal","expected_outcomes","ally_contingencies","priority","status","outcome","adjudication_notes","created_at","submitted_at","adjudicated_at","updated_at"])}function ee(i=[]){return S(i,["id","team","move","phase","priority","categories","query","status","response","responded_by","responded_at","created_at"])}function te(i=[]){return S(i,["id","type","team","move","phase","category","content","faction_tag","debate_marker","created_at"])}function se(i=[]){return S(i,["id","display_name","role","is_active","joined_at","heartbeat_at","disconnected_at","client_id"])}function f(i,e){const t=new Blob([i],{type:"text/csv;charset=utf-8;"}),s=URL.createObjectURL(t),n=document.createElement("a");n.href=s,n.download=e,document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(s)}const l=z("GameMaster");function b(i){return i?new Date(i).getTime():0}function N(i="session"){return String(i).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"session"}function ne(i){return{session:i,gameState:null,participants:[],actions:[],requests:[],timeline:[]}}function ie(i={}){return typeof(i==null?void 0:i.is_active)=="boolean"?i.is_active:!0}function F(i=[]){return i.filter(e=>ie(e))}function $(i=[]){const e=i.length,t=F(i).length;return{total:e,connected:t}}function ae(i=[]){const{total:e,connected:t}=$(i);return e===0?"No participants have joined this session.":t===e?`${t} connected participant${t===1?"":"s"}`:`${t} connected / ${e} total participants`}function re(i=g){var s,n,a,r;const e=((s=i.getRole)==null?void 0:s.call(i))||((a=(n=i.getSessionData)==null?void 0:n.call(i))==null?void 0:a.role)||null,t=e==="white"&&((r=i.hasOperatorAccess)==null?void 0:r.call(i,O.GAME_MASTER,{role:"white"}));return{allowed:e==="white",role:e,cachedOperatorAccess:t}}function L(i=[]){return{activeSessions:i.length,totalParticipants:i.reduce((e,t)=>e+$(t.participants||[]).connected,0),totalActions:i.reduce((e,t)=>{var s;return e+(((s=t.actions)==null?void 0:s.length)||0)},0),pendingRequests:i.reduce((e,t)=>{var s;return e+(((s=t.requests)==null?void 0:s.filter(n=>n.status==="pending").length)||0)},0)}}function q(i=[],e=8){return i.flatMap(t=>(t.timeline||[]).map(s=>{var n,a;return{...s,sessionId:((n=t.session)==null?void 0:n.id)||null,sessionName:((a=t.session)==null?void 0:a.name)||"Unknown Session"}})).sort((t,s)=>b(s.created_at)-b(t.created_at)).slice(0,e)}function U(i=[],e=10){return i.flatMap(t=>F(t.participants||[]).map(s=>{var n,a;return{...s,sessionId:((n=t.session)==null?void 0:n.id)||null,sessionName:((a=t.session)==null?void 0:a.name)||"Unknown Session"}})).sort((t,s)=>b(s.heartbeat_at||s.joined_at)-b(t.heartbeat_at||t.joined_at)).slice(0,e)}function C(){return[{id:"exportJsonBtn",action:"json",successLabel:"JSON"},{id:"exportActionsCsvBtn",action:"csv-actions",successLabel:"Actions CSV"},{id:"exportRequestsCsvBtn",action:"csv-requests",successLabel:"RFIs CSV"},{id:"exportTimelineCsvBtn",action:"csv-timeline",successLabel:"Timeline CSV"},{id:"exportParticipantsCsvBtn",action:"csv-participants",successLabel:"Participants CSV"}]}function oe(i=null){return i!=null&&i.session?{disabled:!1,message:`JSON and CSV exports are ready for ${i.session.name}.`}:{disabled:!0,message:"Select a session before exporting JSON or CSV data."}}class ce{constructor(){this.sessions=[],this.currentSessionId=null,this.sessionBundles=new Map,this.storeUnsubscribers=[]}async init(){if(l.info("Initializing Game Master interface"),!re(g).allowed){l.warn("Blocked direct Game Master access without operator auth"),c("Game Master access requires operator authorization from the landing page.",{type:"error"}),M("index.html#operatorAccessSection",{replace:!0});return}try{const t=await m.requireOperatorGrant(O.GAME_MASTER,{role:"white"});g.setOperatorAuth(t)}catch(t){l.warn("Blocked Game Master access after failed server verification",t),g.clearOperatorAuth(),c("Game Master access requires a valid server-side operator grant.",{type:"error"}),M("index.html#operatorAccessSection",{replace:!0});return}if(!G().ready){l.error("Game Master page blocked: backend configuration is missing");return}this.bindEventListeners(),this.subscribeToLiveStores(),await this.loadSessions(),l.info("Game Master interface initialized")}bindEventListeners(){const e=document.getElementById("createSessionBtn");e&&e.addEventListener("click",()=>this.showCreateSessionModal());const t=document.getElementById("refreshDashboardBtn");t&&t.addEventListener("click",()=>this.loadSessions());const s=document.getElementById("participantsSessionSelect");s&&s.addEventListener("change",a=>{this.handleSessionSelectionChange(a.target.value)});const n=document.getElementById("exportSessionSelect");n&&n.addEventListener("change",a=>{this.handleSessionSelectionChange(a.target.value)}),C().forEach(({id:a,action:r})=>{const o=document.getElementById(a);o&&o.addEventListener("click",()=>{this.exportData(r)})})}async loadSessions(){const e=document.getElementById("sessionsList"),t=e?V(e,{message:"Loading sessions...",replace:!1}):null;try{if(this.sessions=await m.getActiveSessions()||[],t&&t.hide(),this.currentSessionId&&!this.sessions.some(s=>s.id===this.currentSessionId)){this.currentSessionId=null;const s=document.getElementById("sessionDetailSection"),n=document.getElementById("sessionsSection");s&&(s.style.display="none"),n&&(n.style.display="block")}this.renderSessionsList(),this.renderSessionSelectors(),await this.loadDashboardData(),await this.refreshSelectedSessionViews(),l.info(`Loaded ${this.sessions.length} sessions`)}catch(s){l.error("Failed to load sessions:",s),c("Failed to load sessions",{type:"error"}),t&&t.hide()}}async loadDashboardData(){if(this.sessions.length===0){this.sessionBundles=new Map,this.renderDashboardStats(L([])),this.renderRecentActivity([]),this.renderActiveParticipants([]);return}const e=await Promise.all(this.sessions.map(async t=>{try{return await m.fetchSessionBundle(t.id)}catch(s){return l.error("Failed to load session bundle for dashboard:",t.id,s),ne(t)}}));this.sessionBundles=new Map(e.map(t=>[t.session.id,t])),this.renderDashboardStats(L(e)),this.renderRecentActivity(q(e)),this.renderActiveParticipants(U(e))}async handleSessionSelectionChange(e){this.currentSessionId=e||null,await this.refreshSelectedSessionViews(),this.renderSessionsList()}async ensureSessionBundle(e){if(!e)return null;const t=this.sessionBundles.get(e);if(t)return t;const s=await m.fetchSessionBundle(e);return this.sessionBundles.set(e,s),s}async refreshSelectedSessionViews(){if(this.renderSessionSelectors(),!this.currentSessionId){await H.reset(),this.updateHeaderSessionState(null,null),this.renderParticipantsPanel(null),this.updateExportAvailability(null);return}try{const e=await this.ensureSessionBundle(this.currentSessionId);await H.initialize(this.currentSessionId),this.applySelectedLiveBundle(e)}catch(e){l.error("Failed to refresh selected session views:",e),c("Failed to refresh selected session views",{type:"error"})}}subscribeToLiveStores(){const e=()=>{this.applySelectedLiveBundle()};this.storeUnsubscribers.push(T.subscribe(e)),this.storeUnsubscribers.push(D.subscribe(e)),this.storeUnsubscribers.push(k.subscribe(e)),this.storeUnsubscribers.push(P.subscribe(e)),this.storeUnsubscribers.push(j.subscribe(e))}buildSelectedLiveBundle(e=null){var s;if(!this.currentSessionId)return null;const t=(e==null?void 0:e.session)||((s=this.sessionBundles.get(this.currentSessionId))==null?void 0:s.session)||this.sessions.find(n=>n.id===this.currentSessionId)||null;return t?{session:t,gameState:T.getState(),participants:j.getAll(),actions:D.getAll(),requests:k.getAll(),timeline:P.getAll()}:null}applySelectedLiveBundle(e=null){if(!this.currentSessionId)return;const t=this.buildSelectedLiveBundle(e);if(!t)return;this.sessionBundles.set(this.currentSessionId,t);const s=[...this.sessionBundles.values()];this.renderDashboardStats(L(s)),this.renderRecentActivity(q(s)),this.renderActiveParticipants(U(s)),this.updateHeaderSessionState(t.session,t.gameState),this.renderParticipantsPanel(t),this.updateExportAvailability(t);const n=document.getElementById("sessionDetailSection");(n==null?void 0:n.style.display)!=="none"&&this.renderSessionDetails(t.session,t.participants,t.gameState,t.actions,t.requests)}updateHeaderSessionState(e,t){const s=document.getElementById("sessionName"),n=document.getElementById("headerMove"),a=document.getElementById("headerPhase");s&&(s.textContent=e?e.name:"No Session Selected"),n&&(n.textContent=(t==null?void 0:t.move)??"-"),a&&(a.textContent=(t==null?void 0:t.phase)??"-")}renderSessionSelectors(){["participantsSessionSelect","exportSessionSelect"].forEach(e=>{const t=document.getElementById(e);if(!t)return;const s=this.currentSessionId||"";t.innerHTML=`
                <option value="">Select session</option>
                ${this.sessions.map(n=>{var r;const a=((r=n.metadata)==null?void 0:r.session_code)||"N/A";return`<option value="${n.id}">${this.escapeHtml(n.name)} (${a})</option>`}).join("")}
            `,t.value=this.sessions.some(n=>n.id===s)?s:""})}renderDashboardStats(e){const t=document.getElementById("statsGrid");t&&(t.innerHTML=`
            <div class="card stat-card">
                <span class="stat-label">Active Sessions</span>
                <span class="stat-value">${e.activeSessions}</span>
            </div>
            <div class="card stat-card">
                <span class="stat-label">Connected Participants</span>
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
                    No recent activity has been recorded for active sessions.
                </div>
            `;return}t.innerHTML=e.map(s=>`
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                        <div style="display: flex; gap: var(--space-2); align-items: center;">
                            ${v({text:s.type||"EVENT",variant:"info",size:"sm"}).outerHTML}
                            <span class="text-sm font-semibold">${this.escapeHtml(s.sessionName)}</span>
                        </div>
                        <span class="text-xs text-gray-500">${h(s.created_at)}</span>
                    </div>
                    <p class="text-sm">${this.escapeHtml(s.content||"No content provided")}</p>
                </div>
            `).join("")}}renderActiveParticipants(e){const t=document.getElementById("activeParticipants");if(t){if(!e.length){t.innerHTML=`
                <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
                    No participants are currently connected.
                </div>
            `;return}t.innerHTML=e.map(s=>{const n=v({text:s.role||"unknown",variant:"primary",size:"sm"});return`
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                        <div>
                            <p class="text-sm font-semibold">${this.escapeHtml(s.display_name||"Unknown")}</p>
                            <p class="text-xs text-gray-500">${this.escapeHtml(s.sessionName)}</p>
                        </div>
                        ${n.outerHTML}
                    </div>
                    <p class="text-xs text-gray-500">Last active ${h(s.heartbeat_at||s.joined_at)}</p>
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
            `;return}e.innerHTML=this.sessions.map(t=>this.renderSessionCard(t)).join(""),this.sessions.forEach(t=>{const s=e.querySelector(`[data-session-id="${t.id}"]`);if(!s)return;const n=s.querySelector(".view-session-btn"),a=s.querySelector(".select-session-btn"),r=s.querySelector(".delete-session-btn");n&&n.addEventListener("click",()=>{this.viewSession(t.id)}),a&&a.addEventListener("click",()=>{this.handleSessionSelectionChange(t.id)}),r&&r.addEventListener("click",()=>{this.confirmDeleteSession(t.id)})})}}renderSessionCard(e){var r;const t=this.currentSessionId===e.id,s=v({text:e.status||"active",variant:e.status==="active"?"success":"default",size:"sm"}),n=t?v({text:"Selected",variant:"primary",size:"sm"}).outerHTML:"",a=((r=e.metadata)==null?void 0:r.session_code)||"N/A";return`
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
                            <span class="session-meta-value">${h(e.created_at)}</span>
                        </div>
                        <div class="session-meta-item">
                            <span class="session-meta-label">Updated</span>
                            <span class="session-meta-value">${h(e.updated_at)}</span>
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
        `;const t={current:null};t.current=J({title:"Create New Session",content:e,size:"md",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Create Session",variant:"primary",onClick:()=>(this.handleCreateSession(t.current),!1)}]})}async handleCreateSession(e){var o,p;const t=(e==null?void 0:e.element)||document,s=t.querySelector("#sessionName")||document.getElementById("sessionName"),n=t.querySelector("#sessionCode")||document.getElementById("sessionCode"),a=t.querySelector("#sessionDescription")||document.getElementById("sessionDescription");if(!((o=s==null?void 0:s.value)!=null&&o.trim())){c("Session name is required",{type:"error"}),s==null||s.focus();return}const r=W((n==null?void 0:n.value)||"");if(r){c(r,{type:"error"}),n==null||n.focus();return}x({message:"Creating session..."});try{const u={name:s.value.trim(),session_code:n.value.trim().toUpperCase(),description:((p=a==null?void 0:a.value)==null?void 0:p.trim())||null,status:"active",move:1,phase:1},d=await m.createSession(u);c("Session created successfully",{type:"success"}),e&&typeof e.close=="function"?e.close():K(),this.currentSessionId=d.id,await this.loadSessions()}catch(u){l.error("Failed to create session:",u),c(u.message||"Failed to create session",{type:"error"})}finally{w()}}async viewSession(e){this.currentSessionId=e;const t=document.getElementById("sessionsSection"),s=document.getElementById("sessionDetailSection");t&&(t.style.display="none"),s&&(s.style.display="block"),this.renderSessionsList(),await this.refreshSelectedSessionViews()}renderSessionDetails(e,t,s,n=[],a=[]){var _;const r=document.getElementById("sessionDetailContent");if(!r)return;const o=((_=e.metadata)==null?void 0:_.session_code)||"N/A",p=(s==null?void 0:s.move)??1,u=(s==null?void 0:s.phase)??1,d=a.filter(y=>y.status==="pending").length,B=$(t);r.innerHTML=`
            <div class="session-detail-header" style="margin-bottom: var(--space-6);">
                <button class="btn btn-ghost btn-sm" id="backToListBtn">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width: 1em; height: 1em;">
                        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
                    </svg>
                    Back to Sessions
                </button>
                <h2 class="section-title" style="margin-top: var(--space-3);">${this.escapeHtml(e.name)}</h2>
                <p class="text-gray-500">Code: <strong>${this.escapeHtml(o)}</strong></p>
            </div>

            <div class="section-grid section-grid-4" style="margin-bottom: var(--space-6);">
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Current Move</h4>
                    <p class="text-2xl font-bold">${p}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Current Phase</h4>
                    <p class="text-2xl font-bold">${u}</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Participants</h4>
                    <p class="text-2xl font-bold">${B.total}</p>
                    <p class="text-xs text-gray-500">${B.connected} currently connected</p>
                </div>
                <div class="card card-bordered" style="padding: var(--space-4);">
                    <h4 class="text-sm font-semibold text-gray-500">Pending RFIs</h4>
                    <p class="text-2xl font-bold">${d}</p>
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
                        <p class="text-sm">${h(e.updated_at)}</p>
                    </div>
                </div>
            </div>
        `;const A=r.querySelector("#backToListBtn");A&&A.addEventListener("click",()=>{const y=document.getElementById("sessionsSection"),I=document.getElementById("sessionDetailSection");y&&(y.style.display="block"),I&&(I.style.display="none")})}renderParticipantsTable(e){return e.length?`
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
                    ${e.map(t=>{const s=v({text:t.is_active?"Active":"Inactive",variant:t.is_active?"success":"default",size:"sm"});return`
                            <tr>
                                <td>${this.escapeHtml(t.display_name||"Unknown")}</td>
                                <td>${this.escapeHtml(t.role||"Unknown")}</td>
                                <td>${s.outerHTML}</td>
                                <td>${t.heartbeat_at?h(t.heartbeat_at):"Never"}</td>
                            </tr>
                        `}).join("")}
                </tbody>
            </table>
        `:'<p class="text-muted">No participants have joined this session yet.</p>'}renderParticipantsPanel(e){var n;const t=document.getElementById("participantsSelectionState"),s=document.getElementById("participantsList");if(!(!t||!s)){if(!(e!=null&&e.session)){t.textContent="Select a session from Session Management to review live participant data.",s.style.display="flex",s.style.alignItems="center",s.style.justifyContent="center",s.style.minHeight="200px",s.innerHTML=`
                <p class="text-gray-500">Select a session from Session Management to view participants.</p>
            `;return}t.textContent=`Showing live participant data for ${e.session.name}.`,s.style.display="block",s.style.minHeight="auto",s.innerHTML=`
            <div style="padding: var(--space-4);">
                <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-4);">
                    <div>
                        <h3 class="text-base font-semibold">${this.escapeHtml(e.session.name)}</h3>
                        <p class="text-sm text-gray-500">Code ${this.escapeHtml(((n=e.session.metadata)==null?void 0:n.session_code)||"N/A")}</p>
                    </div>
                    <span class="text-sm text-gray-500">${ae(e.participants)}</span>
                </div>
                ${this.renderParticipantsTable(e.participants)}
            </div>
        `}}updateExportAvailability(e){const t=oe(e),s=document.getElementById("exportSelectionState");s&&(s.textContent=t.message),C().forEach(({id:n})=>{const a=document.getElementById(n);a&&(a.disabled=t.disabled)})}async confirmDeleteSession(e){const t=this.sessions.find(n=>n.id===e);if(!t)return;await Q({title:"Delete Session",message:`Are you sure you want to delete "${t.name}"? This action cannot be undone and all associated data will be permanently deleted.`})&&await this.deleteSession(e)}async deleteSession(e){x({message:"Deleting session..."});try{await m.deleteSession(e),this.sessionBundles.delete(e),this.currentSessionId===e&&(this.currentSessionId=null),c("Session deleted successfully",{type:"success"}),await this.loadSessions()}catch(t){l.error("Failed to delete session:",t),c("Failed to delete session",{type:"error"})}finally{w()}}async exportData(e){var s,n,a,r;if(!this.currentSessionId){c("Select a session before exporting.",{type:"warning"});return}const t=C().find(o=>o.action===e);if(!t){c("Unsupported export action.",{type:"error"});return}x({message:"Preparing export..."});try{const o=this.buildSelectedLiveBundle()||await m.fetchSessionBundle(this.currentSessionId);this.sessionBundles.set(this.currentSessionId,o);const p=N(((s=o.session)==null?void 0:s.name)||this.currentSessionId),u=N(((a=(n=o.session)==null?void 0:n.metadata)==null?void 0:a.session_code)||((r=o.session)==null?void 0:r.id)||"session"),d=`esg-${p}-${u}`;switch(e){case"json":Y(X(o),`${d}.json`);break;case"csv-actions":f(Z(o.actions),`${d}-actions.csv`);break;case"csv-requests":f(ee(o.requests),`${d}-rfis.csv`);break;case"csv-timeline":f(te(o.timeline),`${d}-timeline.csv`);break;case"csv-participants":f(se(o.participants),`${d}-participants.csv`);break;default:throw new Error(`Unhandled export action: ${e}`)}c(`${t.successLabel} export is ready.`,{type:"success"})}catch(o){l.error("Export failed:",o),c("Export failed",{type:"error"})}finally{w()}}escapeHtml(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}destroy(){this.storeUnsubscribers.forEach(e=>e==null?void 0:e()),this.storeUnsubscribers=[]}}const E=new ce,R=typeof document<"u"&&!globalThis.__ESG_DISABLE_AUTO_INIT__;R&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{E.init()}):E.init());typeof window<"u"&&R&&window.addEventListener("beforeunload",()=>E.destroy());
//# sourceMappingURL=master-Ds9GoCux.js.map
