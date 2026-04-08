import{s as p,w as N,x as j,c as P,a as o,n as O,m as k,E as u,h as U,q as z,r as v,t as C,y as w,u as b,z as F,A as _,B as D,C as G,D as V,d as S,f as y,j as x}from"./main-Bj4Mtr9K.js";import{s as T,a as M}from"./Modal-O3kyaPUL.js";import{a as Y,f as I,b as $,d as H,c as q,e as W}from"./formatting-DCt3gzwf.js";import{a as Q}from"./validation-C4xOqcjM.js";const h=P("Facilitator");function X({role:A,teamContext:e,observerTeamId:t=null}){return A===e.facilitatorRole?{allowed:!0,readOnly:!1,reason:null}:A===u.ROLES.VIEWER&&t===e.teamId?{allowed:!0,readOnly:!0,reason:null}:A===u.ROLES.VIEWER?{allowed:!1,readOnly:!0,reason:"observer-team-mismatch",observerTeamId:t}:{allowed:!1,readOnly:!1,reason:"role-mismatch"}}class J{constructor(){this.actions=[],this.rfis=[],this.responses=[],this.timelineEvents=[],this.storeUnsubscribers=[],this.role=p.getRole(),this.isReadOnly=!1,this.teamContext=N(),this.teamId=this.teamContext.teamId,this.teamLabel=this.teamContext.teamLabel,this.responseTargets=j(this.teamId)}async init(){var i,a,n,c;h.info("Initializing Facilitator interface");const e=p.getSessionId();if(!e){o({message:"No session found. Please join a session first.",type:"error"}),setTimeout(()=>{O("")},2e3);return}this.role=p.getRole()||((i=p.getSessionData())==null?void 0:i.role);const t=((a=p.getSessionData())==null?void 0:a.team)||null,s=X({role:this.role,teamContext:this.teamContext,observerTeamId:t});if(!s.allowed){const l=s.reason==="observer-team-mismatch"&&s.observerTeamId?k(u.ROLES.VIEWER,{observerTeamId:s.observerTeamId}):"";o({message:s.reason==="observer-team-mismatch"?"Observer access is limited to the team selected when you joined the session.":`This page is only available to the ${this.teamLabel} Facilitator or Observer role.`,type:"error"}),O(l||"",{replace:!0});return}this.isReadOnly=s.readOnly,await U.initialize(e,{participantId:((c=(n=p).getSessionParticipantId)==null?void 0:c.call(n))||null}),this.configureAccessMode(),this.bindEventListeners(),this.subscribeToLiveData(),this.syncActionsFromStore(),this.syncRfisFromStore(),this.syncResponsesFromStores(),this.syncTimelineFromStore(),h.info("Facilitator interface initialized")}isAllowedRole(e){return e===this.teamContext.facilitatorRole||e===u.ROLES.VIEWER}configureAccessMode(){const e=document.getElementById("sessionRoleLabel"),t=document.getElementById("facilitatorModeNotice"),s=document.querySelectorAll('[data-write-control="true"]'),i=document.querySelector(".header-title"),a=document.getElementById("captureNavItem"),n=document.getElementById("captureSection"),c=document.querySelector("#actionsSection .section-description"),l=document.querySelector("#requestsSection .section-description"),r=document.querySelector("#responsesSection .section-description"),f=document.querySelector("#timelineSection .section-description");document.body.dataset.facilitatorMode=this.isReadOnly?"observer":"facilitator",e&&(e.textContent=this.isReadOnly?"Observer":"Facilitator"),i&&(i.textContent=this.isReadOnly?this.teamContext.observerLabel:this.teamContext.facilitatorLabel),s.forEach(d=>{var g;d.hidden=this.isReadOnly,d.toggleAttribute("aria-hidden",this.isReadOnly),(g=d.querySelectorAll)==null||g.call(d,"button, input, select, textarea").forEach(m=>{m.disabled=this.isReadOnly,m.toggleAttribute("aria-disabled",this.isReadOnly)})}),a&&(a.hidden=this.isReadOnly),n&&this.isReadOnly&&(n.style.display="none"),c&&(c.textContent=this.isReadOnly?"Passive observer view of facilitator actions. Drafts are visible but cannot be created, edited, submitted, or deleted.":"Draft actions, submit them to White Cell, and track adjudication results."),l&&(l.textContent=this.isReadOnly?"Passive observer view of RFIs and responses. Request submission is disabled in observer mode.":"Submit questions to White Cell and monitor the response status."),r&&(r.textContent=this.isReadOnly?"Passive feed of White Cell responses to this team.":"View responses to your RFIs and communications"),f&&(f.textContent=this.isReadOnly?"Passive session activity feed for the selected team.":"Chronological view of all events"),t&&(this.isReadOnly?(t.style.display="block",t.innerHTML=`
                    <h2 class="font-semibold mb-2">Observer Mode</h2>
                    <p class="text-sm text-gray-600">
                        This page is passive for the observer role. You can review facilitator actions,
                        White Cell responses, RFIs, and the timeline, but create, edit, submit, delete,
                        and capture paths are blocked in code and hidden in the interface.
                    </p>
                `):(t.style.display="block",t.innerHTML=`
                    <h2 class="font-semibold mb-2">Action Lifecycle</h2>
                    <p class="text-sm text-gray-600">
                        Draft actions stay editable until you submit them to White Cell. Submitted
                        actions become read-only and remain in review until White Cell adjudicates them.
                    </p>
                `))}bindEventListeners(){var i;const e=document.getElementById("newActionBtn"),t=document.getElementById("newRfiBtn"),s=document.getElementById("captureForm");if(this.isReadOnly){e==null||e.setAttribute("aria-disabled","true"),t==null||t.setAttribute("aria-disabled","true"),(i=s==null?void 0:s.querySelectorAll)==null||i.call(s,"button, input, select, textarea").forEach(a=>{a.disabled=!0,a.setAttribute("aria-disabled","true")});return}e==null||e.addEventListener("click",()=>this.showCreateActionModal()),t==null||t.addEventListener("click",()=>this.showCreateRfiModal()),s==null||s.addEventListener("submit",a=>this.handleCaptureSubmit(a))}requireWriteAccess(){return this.isReadOnly?(o({message:"Observer mode is read-only on the facilitator page.",type:"error"}),!1):!0}getCurrentGameState(){var e;return z.getState()||((e=p.getSessionData())==null?void 0:e.gameState)||{move:1,phase:1}}subscribeToLiveData(){this.storeUnsubscribers.push(v.subscribe(()=>{this.syncActionsFromStore()})),this.storeUnsubscribers.push(C.subscribe(()=>{this.syncRfisFromStore(),this.syncResponsesFromStores()})),this.storeUnsubscribers.push(w.subscribe(()=>{this.syncResponsesFromStores()})),this.storeUnsubscribers.push(b.subscribe(()=>{this.syncTimelineFromStore()}))}syncActionsFromStore(){this.actions=v.getByTeam(this.teamId),this.renderActionsList();const e=document.getElementById("actionsBadge");e&&(e.textContent=this.actions.length.toString())}syncRfisFromStore(){this.rfis=C.getByTeam(this.teamId),this.renderRfiList();const e=document.getElementById("rfiBadge");e&&(e.textContent=this.rfis.filter(t=>t.status==="pending").length.toString())}syncResponsesFromStores(){const e=C.getByTeam(this.teamId).filter(s=>s.status==="answered"&&s.response).map(s=>({id:s.id,kind:"rfi",created_at:s.responded_at||s.updated_at||s.created_at,title:s.query||s.question||"RFI response",content:s.response,status:s.status,priority:s.priority})),t=w.getAll().filter(s=>s.from_role==="white_cell"&&this.responseTargets.has(s.to_role)).map(s=>({id:s.id,kind:"communication",created_at:s.created_at,title:this.formatCommunicationTarget(s.to_role),content:s.content,type:s.type||"MESSAGE"}));this.responses=[...e,...t].sort((s,i)=>new Date(i.created_at)-new Date(s.created_at)),this.renderResponsesList()}syncTimelineFromStore(){this.timelineEvents=b.getAll().filter(e=>[this.teamId,"white_cell"].includes(e.team)).slice(0,50),this.renderTimeline()}renderActionsList(){const e=document.getElementById("actionsList");if(e){if(this.actions.length===0){e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No Actions Yet</h3>
                    <p class="empty-state-message">
                        ${this.isReadOnly?"No facilitator actions have been created yet.":"Create your first strategic action to start the draft to White Cell review flow."}
                    </p>
                </div>
            `;return}e.innerHTML=this.actions.map(t=>this.renderActionCard(t)).join(""),e.querySelectorAll(".edit-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(i=>i.id===t.dataset.actionId);s&&this.showEditActionModal(s)})}),e.querySelectorAll(".submit-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(i=>i.id===t.dataset.actionId);s&&this.confirmSubmitAction(s)})}),e.querySelectorAll(".delete-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(i=>i.id===t.dataset.actionId);s&&this.confirmDeleteAction(s)})})}}renderActionCard(e){const t=e.goal||e.title||"Untitled action",s=e.expected_outcomes||e.description||"No expected outcomes",i=Array.isArray(e.targets)?e.targets:e.target?[e.target]:[],a=i.length?i.join(", "):"Not specified",n=e.status||u.ACTION_STATUS.DRAFT,c=!this.isReadOnly&&F(e),l=!this.isReadOnly&&_(e),r=!this.isReadOnly&&D(e),f=e.outcome?Y(e.outcome).outerHTML:"";let d=`
            <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                Draft actions can be edited, submitted, or deleted by the facilitator.
            </p>
        `;return G(e)?d=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Submitted to White Cell ${e.submitted_at?I(e.submitted_at):""}.
                    This action is now read-only for facilitators until adjudication.
                </p>
            `:V(e)?d=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    White Cell adjudicated this action ${e.adjudicated_at?I(e.adjudicated_at):""}.
                </p>
            `:this.isReadOnly&&(d=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Observer mode is read-only. Draft actions are visible but cannot be changed from this page.
                </p>
            `),`
            <div class="card card-bordered" data-action-id="${e.id}" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3);">
                    <div>
                        <h3 class="card-title">${this.escapeHtml(t)}</h3>
                        <p class="card-subtitle text-sm text-gray-500">
                            ${this.escapeHtml(e.mechanism||"No mechanism")} | Move ${e.move||1} | Phase ${e.phase||1}
                        </p>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end;">
                        ${$(n).outerHTML}
                        ${H(e.priority||"NORMAL").outerHTML}
                        ${f}
                    </div>
                </div>

                <div class="card-body">
                    <p class="text-sm mb-3">${this.escapeHtml(s)}</p>
                    ${e.ally_contingencies?`
                        <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                            <strong>Ally Contingencies:</strong> ${this.escapeHtml(e.ally_contingencies)}
                        </p>
                    `:""}
                    <p class="text-xs text-gray-500">
                        <strong>Targets:</strong> ${this.escapeHtml(a)} |
                        <strong>Sector:</strong> ${this.escapeHtml(e.sector||"Not specified")} |
                        <strong>Exposure:</strong> ${this.escapeHtml(e.exposure_type||"Not specified")}
                    </p>
                    ${e.adjudication_notes?`
                        <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                            <strong>Adjudication Notes:</strong> ${this.escapeHtml(e.adjudication_notes)}
                        </p>
                    `:""}
                    ${d}
                </div>

                ${c||l||r?`
                    <div class="card-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
                        ${c?`
                            <button class="btn btn-secondary btn-sm edit-action-btn" data-action-id="${e.id}">
                                Edit Draft
                            </button>
                        `:""}
                        ${l?`
                            <button class="btn btn-primary btn-sm submit-action-btn" data-action-id="${e.id}">
                                Submit to White Cell
                            </button>
                        `:""}
                        ${r?`
                            <button class="btn btn-ghost btn-sm text-error delete-action-btn" data-action-id="${e.id}">
                                Delete Draft
                            </button>
                        `:""}
                    </div>
                `:""}
            </div>
        `}showCreateActionModal(){if(!this.requireWriteAccess())return;const e=this.createActionFormContent(),t={current:null};t.current=T({title:"Create New Action",content:e,size:"lg",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Save Draft",variant:"primary",onClick:()=>(this.handleCreateAction(t.current).catch(s=>{h.error("Failed to create action:",s)}),!1)}]})}showEditActionModal(e){if(!this.requireWriteAccess())return;if(!F(e)){o({message:"Only draft actions can be edited.",type:"error"});return}const t=this.createActionFormContent(e),s={current:null};s.current=T({title:"Edit Draft Action",content:t,size:"lg",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Save Changes",variant:"primary",onClick:()=>(this.handleUpdateAction(s.current,e.id).catch(i=>{h.error("Failed to update action:",i)}),!1)}]})}createActionFormContent(e={}){const t=document.createElement("div"),s=Array.isArray(e.targets)?e.targets:e.target?[e.target]:[],i=u.MECHANISMS.map(r=>`<option value="${r}" ${e.mechanism===r?"selected":""}>${r}</option>`).join(""),a=u.SECTORS.map(r=>`<option value="${r}" ${e.sector===r?"selected":""}>${r}</option>`).join(""),n=u.EXPOSURE_TYPES.map(r=>`<option value="${r}" ${e.exposure_type===r?"selected":""}>${r}</option>`).join(""),c=u.TARGETS.map(r=>`<option value="${r}" ${s.includes(r)?"selected":""}>${r}</option>`).join(""),l=u.PRIORITY.map(r=>`<option value="${r}" ${(e.priority||"NORMAL")===r?"selected":""}>${r}</option>`).join("");return t.innerHTML=`
            <form id="actionForm">
                <div class="form-group">
                    <label class="form-label" for="actionGoal">Goal *</label>
                    <textarea id="actionGoal" class="form-input form-textarea" rows="3" required>${this.escapeHtml(e.goal||e.title||"")}</textarea>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionMechanism">Mechanism *</label>
                        <select id="actionMechanism" class="form-select" required>
                            <option value="">Select mechanism</option>
                            ${i}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionSector">Sector *</label>
                        <select id="actionSector" class="form-select" required>
                            <option value="">Select sector</option>
                            ${a}
                        </select>
                    </div>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionExposureType">Exposure Type</label>
                        <select id="actionExposureType" class="form-select">
                            <option value="">Select exposure type</option>
                            ${n}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionPriority">Priority</label>
                        <select id="actionPriority" class="form-select">
                            ${l}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionTargets">Targets *</label>
                    <select id="actionTargets" class="form-select" multiple size="5" required>
                        ${c}
                    </select>
                    <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionExpectedOutcomes">Expected Outcomes *</label>
                    <textarea id="actionExpectedOutcomes" class="form-input form-textarea" rows="4" required>${this.escapeHtml(e.expected_outcomes||e.description||"")}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionAllyContingencies">Ally Contingencies *</label>
                    <textarea id="actionAllyContingencies" class="form-input form-textarea" rows="3" required>${this.escapeHtml(e.ally_contingencies||"")}</textarea>
                </div>
            </form>
        `,t}getActionFormData(){var i,a,n,c,l,r,f,d,g,m;const e=document.getElementById("actionTargets"),t={goal:(a=(i=document.getElementById("actionGoal"))==null?void 0:i.value)==null?void 0:a.trim(),mechanism:(n=document.getElementById("actionMechanism"))==null?void 0:n.value,sector:(c=document.getElementById("actionSector"))==null?void 0:c.value,exposure_type:((l=document.getElementById("actionExposureType"))==null?void 0:l.value)||null,priority:((r=document.getElementById("actionPriority"))==null?void 0:r.value)||"NORMAL",targets:e?Array.from(e.selectedOptions).map(R=>R.value):[],expected_outcomes:(d=(f=document.getElementById("actionExpectedOutcomes"))==null?void 0:f.value)==null?void 0:d.trim(),ally_contingencies:(m=(g=document.getElementById("actionAllyContingencies"))==null?void 0:g.value)==null?void 0:m.trim()},s=Q(t);return s.valid?t:(o({message:s.errors[0]||"Action validation failed",type:"error"}),null)}async handleCreateAction(e){if(!this.requireWriteAccess())return;const t=this.getActionFormData();if(!t)return;const s=p.getSessionId();if(!s){o({message:"No session found",type:"error"});return}S({message:"Saving draft..."});try{const i=this.getCurrentGameState(),a=await y.createAction({...t,session_id:s,client_id:p.getClientId(),team:this.teamId,status:u.ACTION_STATUS.DRAFT,move:i.move??1,phase:i.phase??1});v.updateFromServer("INSERT",a);const n=await y.createTimelineEvent({session_id:s,type:"ACTION_CREATED",content:`Draft action created: ${a.goal||"Untitled action"}`,metadata:{related_id:a.id},team:this.teamId,move:a.move??1,phase:a.phase??1});b.updateFromServer("INSERT",n),o({message:"Draft action saved",type:"success"}),e==null||e.close()}catch(i){h.error("Failed to create action:",i),o({message:i.message||"Failed to save draft action",type:"error"})}finally{x()}}async handleUpdateAction(e,t){if(!this.requireWriteAccess())return;const s=this.getActionFormData();if(s){S({message:"Updating draft..."});try{const i=await y.updateDraftAction(t,s);v.updateFromServer("UPDATE",i),o({message:"Draft action updated",type:"success"}),e==null||e.close()}catch(i){h.error("Failed to update action:",i),o({message:i.message||"Failed to update draft action",type:"error"})}finally{x()}}}async confirmSubmitAction(e){if(!this.requireWriteAccess())return;if(!_(e)){o({message:"Only draft actions can be submitted.",type:"error"});return}await M({title:"Submit Action",message:"Submit this draft to White Cell for review? After submission it becomes read-only for facilitators.",confirmLabel:"Submit",variant:"primary"})&&await this.submitAction(e.id)}async submitAction(e){if(this.requireWriteAccess()){S({message:"Submitting action..."});try{const t=await y.submitAction(e);v.updateFromServer("UPDATE",t);const s=await y.createTimelineEvent({session_id:t.session_id,type:"ACTION_SUBMITTED",content:`Action submitted to White Cell: ${t.goal||"Untitled action"}`,metadata:{related_id:t.id},team:this.teamId,move:t.move??1,phase:t.phase??1});b.updateFromServer("INSERT",s),o({message:"Action submitted to White Cell",type:"success"})}catch(t){h.error("Failed to submit action:",t),o({message:t.message||"Failed to submit action",type:"error"})}finally{x()}}}async confirmDeleteAction(e){if(!this.requireWriteAccess())return;if(!D(e)){o({message:"Only draft actions can be deleted.",type:"error"});return}await M({title:"Delete Draft Action",message:"Delete this draft action? This cannot be undone.",confirmLabel:"Delete",variant:"danger"})&&await this.deleteAction(e.id)}async deleteAction(e){if(this.requireWriteAccess()){S({message:"Deleting draft..."});try{await y.deleteDraftAction(e),v.updateFromServer("DELETE",{id:e}),o({message:"Draft action deleted",type:"success"})}catch(t){h.error("Failed to delete action:",t),o({message:t.message||"Failed to delete draft action",type:"error"})}finally{x()}}}renderRfiList(){const e=document.getElementById("rfiList");if(e){if(this.rfis.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No RFIs</h3>
                    <p class="empty-state-message">
                        ${this.isReadOnly?`No ${this.teamLabel} RFIs have been submitted yet.`:"Submit a request for information to White Cell when the team needs clarification."}
                    </p>
                </div>
            `;return}e.innerHTML=this.rfis.map(t=>{const s=t.query||t.question||"";return`
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div class="card-header" style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        <span class="text-sm font-semibold">${this.escapeHtml(s)}</span>
                        <div style="display: flex; gap: var(--space-2);">
                            ${$(t.status||"pending").outerHTML}
                            ${H(t.priority||"NORMAL").outerHTML}
                        </div>
                    </div>
                    ${Array.isArray(t.categories)&&t.categories.length?`
                        <p class="text-xs text-gray-500 mt-2"><strong>Categories:</strong> ${this.escapeHtml(t.categories.join(", "))}</p>
                    `:""}
                    ${t.response?`
                        <div class="mt-3 p-3 bg-gray-50 rounded">
                            <strong>Response:</strong> ${this.escapeHtml(t.response)}
                        </div>
                    `:""}
                    <p class="text-xs text-gray-400 mt-2">${I(t.created_at)}</p>
                </div>
            `}).join("")}}showCreateRfiModal(){if(!this.requireWriteAccess())return;const e=document.createElement("div"),t=u.PRIORITY.map(a=>`<option value="${a}">${a}</option>`).join(""),s=u.RFI_CATEGORIES.map(a=>`<option value="${a}">${a}</option>`).join("");e.innerHTML=`
            <form id="rfiForm">
                <div class="form-group">
                    <label class="form-label" for="rfiQuestion">Question *</label>
                    <textarea id="rfiQuestion" class="form-input form-textarea" rows="4" required></textarea>
                </div>
                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="rfiPriority">Priority *</label>
                        <select id="rfiPriority" class="form-select" required>
                            <option value="">Select priority</option>
                            ${t}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="rfiCategories">Categories *</label>
                        <select id="rfiCategories" class="form-select" multiple size="4" required>
                            ${s}
                        </select>
                        <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="rfiContext">Context</label>
                    <textarea id="rfiContext" class="form-input form-textarea" rows="3"></textarea>
                </div>
            </form>
        `;const i={current:null};i.current=T({title:"Submit Request for Information",content:e,size:"md",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Submit RFI",variant:"primary",onClick:()=>(this.handleCreateRfi(i.current).catch(a=>{h.error("Failed to submit RFI:",a)}),!1)}]})}async handleCreateRfi(e){var l,r,f,d,g;if(!this.requireWriteAccess())return;const t=(r=(l=document.getElementById("rfiQuestion"))==null?void 0:l.value)==null?void 0:r.trim(),s=(d=(f=document.getElementById("rfiContext"))==null?void 0:f.value)==null?void 0:d.trim(),i=(g=document.getElementById("rfiPriority"))==null?void 0:g.value,a=document.getElementById("rfiCategories"),n=a?Array.from(a.selectedOptions).map(m=>m.value):[];if(!t){o({message:"Question is required",type:"error"});return}if(!i){o({message:"Priority is required",type:"error"});return}if(!n.length){o({message:"Select at least one category",type:"error"});return}const c=p.getSessionId();if(c){S({message:"Submitting RFI..."});try{const m=this.getCurrentGameState(),R=s?`${t}

Context: ${s}`:t,E=await y.createRequest({session_id:c,team:this.teamId,client_id:p.getClientId(),query:R,priority:i,categories:n,move:m.move??1,phase:m.phase??1});C.updateFromServer("INSERT",E);const B=await y.createTimelineEvent({session_id:c,type:"RFI_CREATED",content:`${this.teamLabel} submitted an RFI to White Cell.`,metadata:{related_id:E.id},team:this.teamId,move:E.move??1,phase:E.phase??1});b.updateFromServer("INSERT",B),o({message:"RFI submitted successfully",type:"success"}),e==null||e.close()}catch(m){h.error("Failed to submit RFI:",m),o({message:m.message||"Failed to submit RFI",type:"error"})}finally{x()}}}renderResponsesList(){const e=document.getElementById("responsesList");if(e){if(this.responses.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Responses Yet</h3>
                    <p class="empty-state-message">White Cell responses and facilitator-directed communications will appear here.</p>
                </div>
            `;return}e.innerHTML=this.responses.map(t=>{const s=t.kind==="rfi"?$("answered").outerHTML:q({text:t.type,variant:"info",size:"sm",rounded:!0}).outerHTML;return`
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                        <div>
                            <h3 class="font-semibold">${this.escapeHtml(t.title)}</h3>
                            <p class="text-xs text-gray-400">${W(t.created_at)}</p>
                        </div>
                        ${s}
                    </div>
                    <p class="text-sm">${this.escapeHtml(t.content||"")}</p>
                </div>
            `}).join("")}}renderTimeline(){const e=document.getElementById("timelineList");if(e){if(this.timelineEvents.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Timeline Events</h3>
                    <p class="empty-state-message">Session activity will appear here as the exercise progresses.</p>
                </div>
            `;return}e.innerHTML=this.timelineEvents.map(t=>`
            <div class="timeline-event" style="display: flex; gap: var(--space-3); padding: var(--space-3); border-bottom: 1px solid var(--color-gray-200);">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-500); margin-top: 6px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        ${q({text:t.type||"EVENT",size:"sm",rounded:!0}).outerHTML}
                        <span class="text-xs text-gray-400">${W(t.created_at)}</span>
                    </div>
                    <p class="text-sm mt-1">${this.escapeHtml(t.content||t.description||"")}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.escapeHtml(this.formatTeamLabel(t.team))} | Move ${t.move||1} | Phase ${t.phase||1}</p>
                </div>
            </div>
        `).join("")}}async handleCaptureSubmit(e){var n,c;if(e.preventDefault(),!this.requireWriteAccess())return;const t=(n=document.querySelector('input[name="captureType"]:checked'))==null?void 0:n.value,s=document.getElementById("captureContent"),i=(c=s==null?void 0:s.value)==null?void 0:c.trim();if(!i){o({message:"Please enter content",type:"error"});return}const a=p.getSessionId();if(a){S({message:"Saving observation..."});try{const l=this.getCurrentGameState(),r=await y.createTimelineEvent({session_id:a,type:t,content:i,team:this.teamId,move:l.move??1,phase:l.phase??1});b.updateFromServer("INSERT",r),o({message:"Observation saved",type:"success"}),s&&(s.value="")}catch(l){h.error("Failed to save capture:",l),o({message:"Failed to save observation",type:"error"})}finally{x()}}}formatCommunicationTarget(e){return{all:"White Cell communication to all teams",[this.teamId]:`White Cell communication to ${this.teamLabel}`,[this.teamContext.facilitatorRole]:`White Cell communication to ${this.teamContext.facilitatorLabel}`}[e]||e||"White Cell communication"}formatTeamLabel(e){return e===this.teamId?this.teamLabel:e==="white_cell"?"White Cell":e||""}escapeHtml(e){if(typeof e!="string")return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}destroy(){this.storeUnsubscribers.forEach(e=>e==null?void 0:e()),this.storeUnsubscribers=[]}}const L=new J,K=typeof document<"u"&&typeof window<"u"&&!globalThis.__ESG_DISABLE_AUTO_INIT__;K&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>L.init()):L.init(),window.addEventListener("beforeunload",()=>L.destroy()));
//# sourceMappingURL=facilitator-CZeveruI.js.map
