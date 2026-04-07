import{s as m,r as F,k as H,c as D,a as n,E as u,j as x,e as p,l as S,m as $,n as L,o as B,q as W,d as y,h as v}from"./main-D2k7VeBg.js";import{s as C,a as w}from"./Modal-O3kyaPUL.js";import{a as q,f as E,b as R,d as O,c as M,e as _}from"./formatting-DOfL1LkK.js";import{a as j}from"./validation-m5KIbpor.js";const d=D("Facilitator");class N{constructor(){this.actions=[],this.rfis=[],this.responses=[],this.timelineEvents=[],this.refreshInterval=null,this.role=m.getRole(),this.isReadOnly=!1,this.teamContext=F(),this.teamId=this.teamContext.teamId,this.teamLabel=this.teamContext.teamLabel,this.responseTargets=H(this.teamId)}async init(){var t;if(d.info("Initializing Facilitator interface"),!m.getSessionId()){n({message:"No session found. Please join a session first.",type:"error"}),setTimeout(()=>{window.location.href="/"},2e3);return}if(this.role=m.getRole()||((t=m.getSessionData())==null?void 0:t.role),!this.isAllowedRole(this.role)){n({message:`This page is only available to the ${this.teamLabel} Facilitator or Observer role.`,type:"error"}),setTimeout(()=>{window.location.href="/"},2e3);return}this.isReadOnly=this.role===u.ROLES.VIEWER,this.configureAccessMode(),this.bindEventListeners(),await this.loadInitialData(),this.startAutoRefresh(),d.info("Facilitator interface initialized")}isAllowedRole(e){return e===this.teamContext.facilitatorRole||e===u.ROLES.VIEWER}configureAccessMode(){const e=document.getElementById("sessionRoleLabel"),t=document.getElementById("facilitatorModeNotice"),s=document.querySelectorAll('[data-write-control="true"]'),i=document.querySelector(".header-title"),r=document.getElementById("captureNavItem"),l=document.getElementById("captureSection");document.body.dataset.facilitatorMode=this.isReadOnly?"observer":"facilitator",e&&(e.textContent=this.isReadOnly?"Observer":"Facilitator"),i&&(i.textContent=this.isReadOnly?this.teamContext.observerLabel:this.teamContext.facilitatorLabel),s.forEach(c=>{c.hidden=this.isReadOnly,c.toggleAttribute("aria-hidden",this.isReadOnly)}),r&&(r.hidden=this.isReadOnly),l&&this.isReadOnly&&(l.style.display="none"),t&&(this.isReadOnly?(t.style.display="block",t.innerHTML=`
                    <h2 class="font-semibold mb-2">Observer Mode</h2>
                    <p class="text-sm text-gray-600">
                        This page is read-only for the viewer role. You can review facilitator actions,
                        White Cell responses, and the timeline, but create, edit, submit, delete, and
                        capture controls are disabled.
                    </p>
                `):(t.style.display="block",t.innerHTML=`
                    <h2 class="font-semibold mb-2">Action Lifecycle</h2>
                    <p class="text-sm text-gray-600">
                        Draft actions stay editable until you submit them to White Cell. Submitted
                        actions become read-only and remain in review until White Cell adjudicates them.
                    </p>
                `))}bindEventListeners(){const e=document.getElementById("newActionBtn"),t=document.getElementById("newRfiBtn"),s=document.getElementById("captureForm");e==null||e.addEventListener("click",()=>this.showCreateActionModal()),t==null||t.addEventListener("click",()=>this.showCreateRfiModal()),s==null||s.addEventListener("submit",i=>this.handleCaptureSubmit(i))}requireWriteAccess(){return this.isReadOnly?(n({message:"Observer mode is read-only on the facilitator page.",type:"error"}),!1):!0}getCurrentGameState(){var e;return((e=m.getSessionData())==null?void 0:e.gameState)||{move:1,phase:1}}async loadInitialData(){try{await Promise.all([this.loadActions(),this.loadRfis(),this.loadResponses(),this.loadTimeline()])}catch(e){d.error("Failed to load initial data:",e)}}async loadActions(){const e=m.getSessionId(),t=document.getElementById("actionsList");if(!t||!e)return;const s=x(t,{message:"Loading actions...",replace:!1});try{this.actions=await p.fetchActions(e,{team:this.teamId}),this.renderActionsList();const i=document.getElementById("actionsBadge");i&&(i.textContent=this.actions.length.toString())}catch(i){d.error("Failed to load actions:",i)}finally{s==null||s.hide()}}renderActionsList(){const e=document.getElementById("actionsList");if(e){if(this.actions.length===0){e.innerHTML=`
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
            `;return}e.innerHTML=this.actions.map(t=>this.renderActionCard(t)).join(""),e.querySelectorAll(".edit-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(i=>i.id===t.dataset.actionId);s&&this.showEditActionModal(s)})}),e.querySelectorAll(".submit-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(i=>i.id===t.dataset.actionId);s&&this.confirmSubmitAction(s)})}),e.querySelectorAll(".delete-action-btn").forEach(t=>{t.addEventListener("click",()=>{const s=this.actions.find(i=>i.id===t.dataset.actionId);s&&this.confirmDeleteAction(s)})})}}renderActionCard(e){const t=e.goal||e.title||"Untitled action",s=e.expected_outcomes||e.description||"No expected outcomes",i=Array.isArray(e.targets)?e.targets:e.target?[e.target]:[],r=i.length?i.join(", "):"Not specified",l=e.status||u.ACTION_STATUS.DRAFT,c=!this.isReadOnly&&S(e),a=!this.isReadOnly&&$(e),o=!this.isReadOnly&&L(e),g=e.outcome?q(e.outcome).outerHTML:"";let h=`
            <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                Draft actions can be edited, submitted, or deleted by the facilitator.
            </p>
        `;return B(e)?h=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Submitted to White Cell ${e.submitted_at?E(e.submitted_at):""}.
                    This action is now read-only for facilitators until adjudication.
                </p>
            `:W(e)?h=`
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    White Cell adjudicated this action ${e.adjudicated_at?E(e.adjudicated_at):""}.
                </p>
            `:this.isReadOnly&&(h=`
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
                        ${R(l).outerHTML}
                        ${O(e.priority||"NORMAL").outerHTML}
                        ${g}
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
                        <strong>Targets:</strong> ${this.escapeHtml(r)} |
                        <strong>Sector:</strong> ${this.escapeHtml(e.sector||"Not specified")} |
                        <strong>Exposure:</strong> ${this.escapeHtml(e.exposure_type||"Not specified")}
                    </p>
                    ${e.adjudication_notes?`
                        <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                            <strong>Adjudication Notes:</strong> ${this.escapeHtml(e.adjudication_notes)}
                        </p>
                    `:""}
                    ${h}
                </div>

                ${c||a||o?`
                    <div class="card-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
                        ${c?`
                            <button class="btn btn-secondary btn-sm edit-action-btn" data-action-id="${e.id}">
                                Edit Draft
                            </button>
                        `:""}
                        ${a?`
                            <button class="btn btn-primary btn-sm submit-action-btn" data-action-id="${e.id}">
                                Submit to White Cell
                            </button>
                        `:""}
                        ${o?`
                            <button class="btn btn-ghost btn-sm text-error delete-action-btn" data-action-id="${e.id}">
                                Delete Draft
                            </button>
                        `:""}
                    </div>
                `:""}
            </div>
        `}showCreateActionModal(){if(!this.requireWriteAccess())return;const e=this.createActionFormContent(),t={current:null};t.current=C({title:"Create New Action",content:e,size:"lg",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Save Draft",variant:"primary",onClick:()=>(this.handleCreateAction(t.current).catch(s=>{d.error("Failed to create action:",s)}),!1)}]})}showEditActionModal(e){if(!this.requireWriteAccess())return;if(!S(e)){n({message:"Only draft actions can be edited.",type:"error"});return}const t=this.createActionFormContent(e),s={current:null};s.current=C({title:"Edit Draft Action",content:t,size:"lg",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Save Changes",variant:"primary",onClick:()=>(this.handleUpdateAction(s.current,e.id).catch(i=>{d.error("Failed to update action:",i)}),!1)}]})}createActionFormContent(e={}){const t=document.createElement("div"),s=Array.isArray(e.targets)?e.targets:e.target?[e.target]:[],i=u.MECHANISMS.map(o=>`<option value="${o}" ${e.mechanism===o?"selected":""}>${o}</option>`).join(""),r=u.SECTORS.map(o=>`<option value="${o}" ${e.sector===o?"selected":""}>${o}</option>`).join(""),l=u.EXPOSURE_TYPES.map(o=>`<option value="${o}" ${e.exposure_type===o?"selected":""}>${o}</option>`).join(""),c=u.TARGETS.map(o=>`<option value="${o}" ${s.includes(o)?"selected":""}>${o}</option>`).join(""),a=u.PRIORITY.map(o=>`<option value="${o}" ${(e.priority||"NORMAL")===o?"selected":""}>${o}</option>`).join("");return t.innerHTML=`
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
                            ${r}
                        </select>
                    </div>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionExposureType">Exposure Type</label>
                        <select id="actionExposureType" class="form-select">
                            <option value="">Select exposure type</option>
                            ${l}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionPriority">Priority</label>
                        <select id="actionPriority" class="form-select">
                            ${a}
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
        `,t}getActionFormData(){var i,r,l,c,a,o,g,h,b,f;const e=document.getElementById("actionTargets"),t={goal:(r=(i=document.getElementById("actionGoal"))==null?void 0:i.value)==null?void 0:r.trim(),mechanism:(l=document.getElementById("actionMechanism"))==null?void 0:l.value,sector:(c=document.getElementById("actionSector"))==null?void 0:c.value,exposure_type:((a=document.getElementById("actionExposureType"))==null?void 0:a.value)||null,priority:((o=document.getElementById("actionPriority"))==null?void 0:o.value)||"NORMAL",targets:e?Array.from(e.selectedOptions).map(A=>A.value):[],expected_outcomes:(h=(g=document.getElementById("actionExpectedOutcomes"))==null?void 0:g.value)==null?void 0:h.trim(),ally_contingencies:(f=(b=document.getElementById("actionAllyContingencies"))==null?void 0:b.value)==null?void 0:f.trim()},s=j(t);return s.valid?t:(n({message:s.errors[0]||"Action validation failed",type:"error"}),null)}async handleCreateAction(e){if(!this.requireWriteAccess())return;const t=this.getActionFormData();if(!t)return;const s=m.getSessionId();if(!s){n({message:"No session found",type:"error"});return}y({message:"Saving draft..."});try{const i=this.getCurrentGameState(),r=await p.createAction({...t,session_id:s,client_id:m.getClientId(),team:this.teamId,status:u.ACTION_STATUS.DRAFT,move:i.move??1,phase:i.phase??1});await p.createTimelineEvent({session_id:s,type:"ACTION_CREATED",content:`Draft action created: ${r.goal||"Untitled action"}`,metadata:{related_id:r.id},team:this.teamId,move:r.move??1,phase:r.phase??1}),n({message:"Draft action saved",type:"success"}),e==null||e.close(),await Promise.all([this.loadActions(),this.loadTimeline()])}catch(i){d.error("Failed to create action:",i),n({message:i.message||"Failed to save draft action",type:"error"})}finally{v()}}async handleUpdateAction(e,t){if(!this.requireWriteAccess())return;const s=this.getActionFormData();if(s){y({message:"Updating draft..."});try{await p.updateDraftAction(t,s),n({message:"Draft action updated",type:"success"}),e==null||e.close(),await this.loadActions()}catch(i){d.error("Failed to update action:",i),n({message:i.message||"Failed to update draft action",type:"error"})}finally{v()}}}async confirmSubmitAction(e){if(!this.requireWriteAccess())return;if(!$(e)){n({message:"Only draft actions can be submitted.",type:"error"});return}await w({title:"Submit Action",message:"Submit this draft to White Cell for review? After submission it becomes read-only for facilitators.",confirmLabel:"Submit",variant:"primary"})&&await this.submitAction(e.id)}async submitAction(e){y({message:"Submitting action..."});try{const t=await p.submitAction(e);await p.createTimelineEvent({session_id:t.session_id,type:"ACTION_SUBMITTED",content:`Action submitted to White Cell: ${t.goal||"Untitled action"}`,metadata:{related_id:t.id},team:this.teamId,move:t.move??1,phase:t.phase??1}),n({message:"Action submitted to White Cell",type:"success"}),await Promise.all([this.loadActions(),this.loadTimeline()])}catch(t){d.error("Failed to submit action:",t),n({message:t.message||"Failed to submit action",type:"error"})}finally{v()}}async confirmDeleteAction(e){if(!this.requireWriteAccess())return;if(!L(e)){n({message:"Only draft actions can be deleted.",type:"error"});return}await w({title:"Delete Draft Action",message:"Delete this draft action? This cannot be undone.",confirmLabel:"Delete",variant:"danger"})&&await this.deleteAction(e.id)}async deleteAction(e){y({message:"Deleting draft..."});try{await p.deleteDraftAction(e),n({message:"Draft action deleted",type:"success"}),await this.loadActions()}catch(t){d.error("Failed to delete action:",t),n({message:t.message||"Failed to delete draft action",type:"error"})}finally{v()}}async loadRfis(){const e=m.getSessionId(),t=document.getElementById("rfiList");if(!t||!e)return;const s=x(t,{message:"Loading RFIs...",replace:!1});try{const i=await p.fetchRequests(e,{team:this.teamId});this.rfis=i||[],this.renderRfiList();const r=document.getElementById("rfiBadge");r&&(r.textContent=this.rfis.filter(l=>l.status==="pending").length.toString())}catch(i){d.error("Failed to load RFIs:",i)}finally{s==null||s.hide()}}renderRfiList(){const e=document.getElementById("rfiList");if(e){if(this.rfis.length===0){e.innerHTML=`
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
                            ${R(t.status||"pending").outerHTML}
                            ${O(t.priority||"NORMAL").outerHTML}
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
                    <p class="text-xs text-gray-400 mt-2">${E(t.created_at)}</p>
                </div>
            `}).join("")}}showCreateRfiModal(){if(!this.requireWriteAccess())return;const e=document.createElement("div"),t=u.PRIORITY.map(r=>`<option value="${r}">${r}</option>`).join(""),s=u.RFI_CATEGORIES.map(r=>`<option value="${r}">${r}</option>`).join("");e.innerHTML=`
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
        `;const i={current:null};i.current=C({title:"Submit Request for Information",content:e,size:"md",buttons:[{label:"Cancel",variant:"secondary",onClick:()=>{}},{label:"Submit RFI",variant:"primary",onClick:()=>(this.handleCreateRfi(i.current).catch(r=>{d.error("Failed to submit RFI:",r)}),!1)}]})}async handleCreateRfi(e){var a,o,g,h,b;if(!this.requireWriteAccess())return;const t=(o=(a=document.getElementById("rfiQuestion"))==null?void 0:a.value)==null?void 0:o.trim(),s=(h=(g=document.getElementById("rfiContext"))==null?void 0:g.value)==null?void 0:h.trim(),i=(b=document.getElementById("rfiPriority"))==null?void 0:b.value,r=document.getElementById("rfiCategories"),l=r?Array.from(r.selectedOptions).map(f=>f.value):[];if(!t){n({message:"Question is required",type:"error"});return}if(!i){n({message:"Priority is required",type:"error"});return}if(!l.length){n({message:"Select at least one category",type:"error"});return}const c=m.getSessionId();if(c){y({message:"Submitting RFI..."});try{const f=this.getCurrentGameState(),A=s?`${t}

Context: ${s}`:t,I=await p.createRequest({session_id:c,team:this.teamId,client_id:m.getClientId(),query:A,priority:i,categories:l,move:f.move??1,phase:f.phase??1});await p.createTimelineEvent({session_id:c,type:"RFI_CREATED",content:`${this.teamLabel} submitted an RFI to White Cell.`,metadata:{related_id:I.id},team:this.teamId,move:I.move??1,phase:I.phase??1}),n({message:"RFI submitted successfully",type:"success"}),e==null||e.close(),await Promise.all([this.loadRfis(),this.loadResponses(),this.loadTimeline()])}catch(f){d.error("Failed to submit RFI:",f),n({message:f.message||"Failed to submit RFI",type:"error"})}finally{v()}}}async loadResponses(){const e=m.getSessionId(),t=document.getElementById("responsesList");if(!t||!e)return;const s=x(t,{message:"Loading responses...",replace:!1});try{const[i,r]=await Promise.all([p.fetchRequests(e),p.fetchCommunications(e)]),l=(i||[]).filter(a=>a.team===this.teamId&&a.status==="answered"&&a.response).map(a=>({id:a.id,kind:"rfi",created_at:a.responded_at||a.updated_at||a.created_at,title:a.query||a.question||"RFI response",content:a.response,status:a.status,priority:a.priority})),c=(r||[]).filter(a=>a.from_role==="white_cell"&&this.responseTargets.has(a.to_role)).map(a=>({id:a.id,kind:"communication",created_at:a.created_at,title:this.formatCommunicationTarget(a.to_role),content:a.content,type:a.type||"MESSAGE"}));this.responses=[...l,...c].sort((a,o)=>new Date(o.created_at)-new Date(a.created_at)),this.renderResponsesList()}catch(i){d.error("Failed to load responses:",i)}finally{s==null||s.hide()}}renderResponsesList(){const e=document.getElementById("responsesList");if(e){if(this.responses.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Responses Yet</h3>
                    <p class="empty-state-message">White Cell responses and facilitator-directed communications will appear here.</p>
                </div>
            `;return}e.innerHTML=this.responses.map(t=>{const s=t.kind==="rfi"?R("answered").outerHTML:M({text:t.type,variant:"info",size:"sm",rounded:!0}).outerHTML;return`
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                        <div>
                            <h3 class="font-semibold">${this.escapeHtml(t.title)}</h3>
                            <p class="text-xs text-gray-400">${_(t.created_at)}</p>
                        </div>
                        ${s}
                    </div>
                    <p class="text-sm">${this.escapeHtml(t.content||"")}</p>
                </div>
            `}).join("")}}async loadTimeline(){const e=m.getSessionId(),t=document.getElementById("timelineList");if(!t||!e)return;const s=x(t,{message:"Loading timeline...",replace:!1});try{const i=await p.fetchTimeline(e,{limit:50});this.timelineEvents=(i||[]).filter(r=>[this.teamId,"white_cell"].includes(r.team)),this.renderTimeline()}catch(i){d.error("Failed to load timeline:",i)}finally{s==null||s.hide()}}renderTimeline(){const e=document.getElementById("timelineList");if(e){if(this.timelineEvents.length===0){e.innerHTML=`
                <div class="empty-state">
                    <h3 class="empty-state-title">No Timeline Events</h3>
                    <p class="empty-state-message">Session activity will appear here as the exercise progresses.</p>
                </div>
            `;return}e.innerHTML=this.timelineEvents.map(t=>`
            <div class="timeline-event" style="display: flex; gap: var(--space-3); padding: var(--space-3); border-bottom: 1px solid var(--color-gray-200);">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-500); margin-top: 6px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        ${M({text:t.type||"EVENT",size:"sm",rounded:!0}).outerHTML}
                        <span class="text-xs text-gray-400">${_(t.created_at)}</span>
                    </div>
                    <p class="text-sm mt-1">${this.escapeHtml(t.content||t.description||"")}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.escapeHtml(this.formatTeamLabel(t.team))} | Move ${t.move||1} | Phase ${t.phase||1}</p>
                </div>
            </div>
        `).join("")}}async handleCaptureSubmit(e){var l,c;if(e.preventDefault(),!this.requireWriteAccess())return;const t=(l=document.querySelector('input[name="captureType"]:checked'))==null?void 0:l.value,s=document.getElementById("captureContent"),i=(c=s==null?void 0:s.value)==null?void 0:c.trim();if(!i){n({message:"Please enter content",type:"error"});return}const r=m.getSessionId();if(r){y({message:"Saving observation..."});try{const a=this.getCurrentGameState();await p.createTimelineEvent({session_id:r,type:t,content:i,team:this.teamId,move:a.move??1,phase:a.phase??1}),n({message:"Observation saved",type:"success"}),s&&(s.value=""),await this.loadTimeline()}catch(a){d.error("Failed to save capture:",a),n({message:"Failed to save observation",type:"error"})}finally{v()}}}formatCommunicationTarget(e){return{all:"White Cell communication to all teams",[this.teamId]:`White Cell communication to ${this.teamLabel}`,[this.teamContext.facilitatorRole]:`White Cell communication to ${this.teamContext.facilitatorLabel}`}[e]||e||"White Cell communication"}formatTeamLabel(e){return e===this.teamId?this.teamLabel:e==="white_cell"?"White Cell":e||""}startAutoRefresh(){this.refreshInterval=setInterval(()=>{Promise.all([this.loadActions(),this.loadRfis(),this.loadResponses(),this.loadTimeline()]).catch(e=>{d.error("Facilitator auto-refresh failed:",e)})},3e4)}stopAutoRefresh(){this.refreshInterval&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}escapeHtml(e){if(typeof e!="string")return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}destroy(){this.stopAutoRefresh()}}const T=new N;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>T.init()):T.init();window.addEventListener("beforeunload",()=>T.destroy());
//# sourceMappingURL=facilitator-Dms5JxPY.js.map
