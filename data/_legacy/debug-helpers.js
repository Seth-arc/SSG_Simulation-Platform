/**
 * debug-helpers.js - Debugging utilities for ESG Demo Platform
 *
 * Provides tools to diagnose data flow issues between roles,
 * session synchronization problems, and storage key mismatches.
 */

(function() {
    'use strict';

    // ==========================================
    // DEBUG CONFIGURATION
    // ==========================================

    const DEBUG_CONFIG = {
        enabled: true,
        logLevel: 'info', // 'error', 'warn', 'info', 'debug'
        showTimestamps: true,
        highlightErrors: true
    };

    const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

    // ==========================================
    // LOGGING UTILITIES
    // ==========================================

    function getTimestamp() {
        return new Date().toISOString().split('T')[1].split('.')[0];
    }

    function log(level, category, message, data = null) {
        if (!DEBUG_CONFIG.enabled) return;
        if (LOG_LEVELS[level] > LOG_LEVELS[DEBUG_CONFIG.logLevel]) return;

        const timestamp = DEBUG_CONFIG.showTimestamps ? `[${getTimestamp()}]` : '';
        const prefix = `${timestamp} [ESG-DEBUG] [${category.toUpperCase()}]`;

        const styles = {
            error: 'color: #ff4444; font-weight: bold;',
            warn: 'color: #ffaa00; font-weight: bold;',
            info: 'color: #4488ff;',
            debug: 'color: #888888;'
        };

        if (data) {
            console.groupCollapsed(`%c${prefix} ${message}`, styles[level]);
            console.log(data);
            console.groupEnd();
        } else {
            console.log(`%c${prefix} ${message}`, styles[level]);
        }
    }

    // ==========================================
    // SESSION DIAGNOSTICS
    // ==========================================

    function diagnoseSession() {
        const results = {
            timestamp: new Date().toISOString(),
            sessionStorage: {},
            localStorage: {},
            supabase: {},
            issues: []
        };

        // Check sessionStorage
        results.sessionStorage = {
            session_id: sessionStorage.getItem('esg_session_id'),
            client_id: sessionStorage.getItem('esg_client_id'),
            role: sessionStorage.getItem('esg_role')
        };

        if (!results.sessionStorage.session_id) {
            results.issues.push({
                severity: 'critical',
                message: 'No session ID in sessionStorage - user may not have joined a session',
                fix: 'Ensure user joins a session via Game Master or session picker'
            });
        }

        if (!results.sessionStorage.role) {
            results.issues.push({
                severity: 'warning',
                message: 'No role set in sessionStorage',
                fix: 'User should log in with appropriate role credentials'
            });
        }

        // Check localStorage for data-layer state
        results.localStorage = {
            sharedGameState: safeGetLocalStorage('sharedGameState'),
            sharedTimer: safeGetLocalStorage('sharedTimer'),
            esg_sharedState: safeGetLocalStorage('esg:sharedState'),
            esg_sharedTimer: safeGetLocalStorage('esg:sharedTimer')
        };

        // Check Supabase availability
        results.supabase = {
            available: typeof window.supabase !== 'undefined',
            clientInitialized: typeof window.esg !== 'undefined',
            isSupabaseAvailable: window.isSupabaseAvailable || false
        };

        if (!results.supabase.available) {
            results.issues.push({
                severity: 'warning',
                message: 'Supabase library not loaded - using localStorage fallback',
                fix: 'Check that supabase-js is loaded in HTML before data-layer.js'
            });
        }

        return results;
    }

    function safeGetLocalStorage(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            return { error: e.message };
        }
    }

    // ==========================================
    // STORAGE KEY DIAGNOSTICS
    // ==========================================

    function diagnoseStorageKeys() {
        const sessionId = sessionStorage.getItem('esg_session_id');
        const results = {
            sessionId: sessionId,
            keys: {
                actions: [],
                requests: [],
                communications: [],
                timeline: [],
                gameState: [],
                other: []
            },
            keyPatterns: {},
            issues: []
        };

        // Scan all localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key.includes('Action') || key.includes('action')) {
                results.keys.actions.push(key);
            } else if (key.includes('Request') || key.includes('request')) {
                results.keys.requests.push(key);
            } else if (key.includes('communication') || key.includes('Communication')) {
                results.keys.communications.push(key);
            } else if (key.includes('timeline') || key.includes('Timeline') || key.includes('whiteCell')) {
                results.keys.timeline.push(key);
            } else if (key.includes('gameState') || key.includes('GameState') || key.includes('sharedState')) {
                results.keys.gameState.push(key);
            } else if (key.startsWith('esg') || key.includes('move') || key.includes('session')) {
                results.keys.other.push(key);
            }
        }

        // Analyze key patterns
        const patterns = {
            sessionBased: 0,
            moveBased: 0,
            legacy: 0
        };

        [...results.keys.actions, ...results.keys.requests].forEach(key => {
            if (key.includes('session_')) {
                patterns.sessionBased++;
            } else if (key.includes('move_') && !key.includes('session_')) {
                patterns.moveBased++;
            } else {
                patterns.legacy++;
            }
        });

        results.keyPatterns = patterns;

        // Check for mismatches
        if (patterns.sessionBased > 0 && patterns.moveBased > 0) {
            results.issues.push({
                severity: 'critical',
                message: 'Mixed storage key patterns detected - some data uses session IDs, some does not',
                details: `Session-based keys: ${patterns.sessionBased}, Move-only keys: ${patterns.moveBased}`,
                fix: 'Run window.esgDebug.migrateToConsistentKeys() to standardize'
            });
        }

        if (sessionId && patterns.moveBased > patterns.sessionBased) {
            results.issues.push({
                severity: 'warning',
                message: 'Most data stored without session ID - may cause cross-session data leakage',
                fix: 'Data should use session-specific keys when a session is active'
            });
        }

        return results;
    }

    // ==========================================
    // DATA FLOW DIAGNOSTICS
    // ==========================================

    function diagnoseDataFlow() {
        const sessionId = sessionStorage.getItem('esg_session_id');
        const role = sessionStorage.getItem('esg_role');
        const results = {
            role: role,
            sessionId: sessionId,
            dataFound: {},
            expectedKeys: {},
            actualKeys: {},
            issues: []
        };

        // Define expected keys based on role
        for (let move = 1; move <= 3; move++) {
            // Session-based keys (preferred)
            const sessionKeys = {
                actions: `blueActions_session_${sessionId}_move_${move}`,
                requests: `blueRequests_session_${sessionId}_move_${move}`,
                communications: `communications_session_${sessionId}_move_${move}`,
                whiteCell: `whiteCell_session_${sessionId}_move_${move}`,
                notes: `notes_session_${sessionId}_move_${move}`
            };

            // Legacy keys (fallback)
            const legacyKeys = {
                actions: `blueActions_move_${move}`,
                actions_alt: `actions_move_${move}`,
                requests: `blueRequests_move_${move}`,
                communications: `communications_move_${move}`,
                whiteCell: `whiteCell_move_${move}`,
                notes: `notes_move_${move}`,
                facilitator: `blueFacilitatorMove${move}`
            };

            results.expectedKeys[move] = { sessionKeys, legacyKeys };
            results.actualKeys[move] = {};
            results.dataFound[move] = {};

            // Check which keys actually have data
            Object.entries(sessionKeys).forEach(([type, key]) => {
                const data = safeGetLocalStorage(key);
                if (data) {
                    results.actualKeys[move][`session_${type}`] = key;
                    results.dataFound[move][`session_${type}`] = summarizeData(data);
                }
            });

            Object.entries(legacyKeys).forEach(([type, key]) => {
                const data = safeGetLocalStorage(key);
                if (data) {
                    results.actualKeys[move][`legacy_${type}`] = key;
                    results.dataFound[move][`legacy_${type}`] = summarizeData(data);
                }
            });
        }

        // Check for common issues
        if (role === 'blue_facilitator' || role === 'blue') {
            // Facilitator should be writing actions
            const hasSessionActions = Object.keys(results.actualKeys).some(
                move => results.actualKeys[move].session_actions
            );
            const hasLegacyActions = Object.keys(results.actualKeys).some(
                move => results.actualKeys[move].legacy_actions || results.actualKeys[move].legacy_actions_alt
            );

            if (!hasSessionActions && !hasLegacyActions) {
                results.issues.push({
                    severity: 'info',
                    message: 'No actions found in storage - this is normal if no actions have been submitted yet'
                });
            } else if (hasLegacyActions && !hasSessionActions && sessionId) {
                results.issues.push({
                    severity: 'warning',
                    message: 'Actions stored with legacy keys but session is active',
                    fix: 'White Cell may not find these actions - check White Cell is using same session'
                });
            }
        }

        if (role === 'blue_whitecell' || role === 'white') {
            // White Cell should be reading actions from Facilitator
            const hasAnyActions = Object.keys(results.actualKeys).some(
                move => Object.keys(results.actualKeys[move]).some(k => k.includes('action'))
            );

            if (!hasAnyActions) {
                results.issues.push({
                    severity: 'warning',
                    message: 'No action data found - Facilitator may not have submitted actions yet, or using different session'
                });
            }
        }

        return results;
    }

    function summarizeData(data) {
        if (!data) return null;
        if (Array.isArray(data)) {
            return { type: 'array', count: data.length };
        }
        if (typeof data === 'object') {
            const summary = { type: 'object', keys: Object.keys(data) };
            if (data.actions) summary.actionsCount = data.actions.length;
            if (data.timelineItems) summary.timelineCount = data.timelineItems.length;
            return summary;
        }
        return { type: typeof data, value: data };
    }

    // ==========================================
    // REAL-TIME DATA WATCHER
    // ==========================================

    let watcherInterval = null;

    function startDataWatcher(intervalMs = 5000) {
        if (watcherInterval) {
            console.log('[ESG-DEBUG] Data watcher already running');
            return;
        }

        console.log(`[ESG-DEBUG] Starting data watcher (interval: ${intervalMs}ms)`);

        let lastState = JSON.stringify(diagnoseStorageKeys());

        watcherInterval = setInterval(() => {
            const currentState = JSON.stringify(diagnoseStorageKeys());
            if (currentState !== lastState) {
                log('info', 'watcher', 'Storage changed detected!');
                const diagnosis = diagnoseStorageKeys();
                console.table(diagnosis.keys);
                lastState = currentState;
            }
        }, intervalMs);

        return 'Watcher started. Call window.esgDebug.stopDataWatcher() to stop.';
    }

    function stopDataWatcher() {
        if (watcherInterval) {
            clearInterval(watcherInterval);
            watcherInterval = null;
            console.log('[ESG-DEBUG] Data watcher stopped');
            return 'Watcher stopped';
        }
        return 'No watcher running';
    }

    // ==========================================
    // KEY MIGRATION UTILITY
    // ==========================================

    function migrateToConsistentKeys(dryRun = true) {
        const sessionId = sessionStorage.getItem('esg_session_id');
        if (!sessionId) {
            return {
                success: false,
                error: 'No session ID - cannot migrate without active session'
            };
        }

        const migrations = [];
        const errors = [];

        for (let move = 1; move <= 3; move++) {
            // Define migration mappings
            const mappings = [
                { from: `blueActions_move_${move}`, to: `blueActions_session_${sessionId}_move_${move}` },
                { from: `actions_move_${move}`, to: `blueActions_session_${sessionId}_move_${move}` },
                { from: `blueRequests_move_${move}`, to: `blueRequests_session_${sessionId}_move_${move}` },
                { from: `communications_move_${move}`, to: `communications_session_${sessionId}_move_${move}` },
                { from: `whiteCell_move_${move}`, to: `whiteCell_session_${sessionId}_move_${move}` },
                { from: `notes_move_${move}`, to: `notes_session_${sessionId}_move_${move}` },
                { from: `whiteCellFeedback_move_${move}`, to: `whiteCellFeedback_session_${sessionId}_move_${move}` },
                { from: `whiteCellRulings_move_${move}`, to: `whiteCellRulings_session_${sessionId}_move_${move}` }
            ];

            mappings.forEach(({ from, to }) => {
                const sourceData = localStorage.getItem(from);
                const targetData = localStorage.getItem(to);

                if (sourceData && !targetData) {
                    migrations.push({ from, to, action: 'copy', dataSize: sourceData.length });

                    if (!dryRun) {
                        try {
                            localStorage.setItem(to, sourceData);
                            log('info', 'migrate', `Copied ${from} -> ${to}`);
                        } catch (e) {
                            errors.push({ key: from, error: e.message });
                        }
                    }
                } else if (sourceData && targetData) {
                    migrations.push({ from, to, action: 'skip_exists', reason: 'Target already has data' });
                }
            });
        }

        return {
            success: errors.length === 0,
            dryRun: dryRun,
            sessionId: sessionId,
            migrations: migrations,
            errors: errors,
            message: dryRun
                ? `Dry run complete. ${migrations.filter(m => m.action === 'copy').length} keys would be migrated. Run with dryRun=false to execute.`
                : `Migration complete. ${migrations.filter(m => m.action === 'copy').length} keys migrated.`
        };
    }

    // ==========================================
    // CROSS-ROLE DATA CHECK
    // ==========================================

    function checkCrossRoleData() {
        const sessionId = sessionStorage.getItem('esg_session_id');
        const results = {
            sessionId: sessionId,
            facilitatorData: { found: false, keys: [], summary: {} },
            whiteCellData: { found: false, keys: [], summary: {} },
            notetakerData: { found: false, keys: [], summary: {} },
            syncStatus: 'unknown',
            issues: []
        };

        for (let move = 1; move <= 3; move++) {
            // Check Facilitator data
            const facilitatorKeys = [
                `blueActions_session_${sessionId}_move_${move}`,
                `blueActions_move_${move}`,
                `actions_move_${move}`
            ];

            facilitatorKeys.forEach(key => {
                const data = safeGetLocalStorage(key);
                if (data) {
                    results.facilitatorData.found = true;
                    results.facilitatorData.keys.push(key);
                    results.facilitatorData.summary[move] = summarizeData(data);
                }
            });

            // Check White Cell data
            const whiteCellKeys = [
                `whiteCell_session_${sessionId}_move_${move}`,
                `whiteCell_move_${move}`
            ];

            whiteCellKeys.forEach(key => {
                const data = safeGetLocalStorage(key);
                if (data) {
                    results.whiteCellData.found = true;
                    results.whiteCellData.keys.push(key);
                    results.whiteCellData.summary[move] = summarizeData(data);
                }
            });

            // Check Notetaker data
            const notetakerKeys = [
                `notes_session_${sessionId}_move_${move}`,
                `notes_move_${move}`
            ];

            notetakerKeys.forEach(key => {
                const data = safeGetLocalStorage(key);
                if (data) {
                    results.notetakerData.found = true;
                    results.notetakerData.keys.push(key);
                    results.notetakerData.summary[move] = summarizeData(data);
                }
            });
        }

        // Determine sync status
        if (results.facilitatorData.found && !results.whiteCellData.found) {
            results.syncStatus = 'facilitator_only';
            results.issues.push({
                severity: 'warning',
                message: 'Facilitator has data but White Cell storage is empty',
                possibleCauses: [
                    'White Cell has not loaded data yet',
                    'Different session IDs between roles',
                    'Storage key mismatch'
                ]
            });
        } else if (!results.facilitatorData.found && results.whiteCellData.found) {
            results.syncStatus = 'whitecell_only';
        } else if (results.facilitatorData.found && results.whiteCellData.found) {
            results.syncStatus = 'both_have_data';
        } else {
            results.syncStatus = 'no_data';
        }

        return results;
    }

    // ==========================================
    // QUICK FIX UTILITIES
    // ==========================================

    function forceSessionSync() {
        const sessionId = sessionStorage.getItem('esg_session_id');
        if (!sessionId) {
            return { success: false, error: 'No session ID to sync' };
        }

        // Broadcast session ID via localStorage event
        localStorage.setItem('_sessionSync', JSON.stringify({
            sessionId: sessionId,
            timestamp: Date.now(),
            source: sessionStorage.getItem('esg_role') || 'unknown'
        }));

        // Update CURRENT_SESSION_ID if window.esg exists
        if (window.esg && typeof window.esg.setCurrentSessionId === 'function') {
            window.esg.setCurrentSessionId(sessionId);
        }

        return {
            success: true,
            sessionId: sessionId,
            message: 'Session sync broadcast sent. Other tabs should pick up the session ID.'
        };
    }

    function clearAllEsgData(confirm = false) {
        if (!confirm) {
            return {
                success: false,
                message: 'This will delete ALL ESG data. Call with confirm=true to proceed.',
                warning: 'This action cannot be undone!'
            };
        }

        const keysRemoved = [];
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.includes('esg') ||
                key.includes('blue') ||
                key.includes('white') ||
                key.includes('action') ||
                key.includes('Action') ||
                key.includes('request') ||
                key.includes('Request') ||
                key.includes('move') ||
                key.includes('session') ||
                key.includes('timeline') ||
                key.includes('communication') ||
                key.includes('shared')
            )) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
                keysRemoved.push(key);
            } catch (e) {
                console.error(`Failed to remove ${key}:`, e);
            }
        });

        // Clear session storage too
        sessionStorage.clear();

        return {
            success: true,
            keysRemoved: keysRemoved,
            message: `Removed ${keysRemoved.length} keys. Refresh the page to start fresh.`
        };
    }

    // ==========================================
    // COMPREHENSIVE DIAGNOSIS
    // ==========================================

    function runFullDiagnosis() {
        console.log('%c[ESG-DEBUG] Running Full Diagnosis...', 'color: #4488ff; font-weight: bold; font-size: 14px;');

        const results = {
            timestamp: new Date().toISOString(),
            session: diagnoseSession(),
            storageKeys: diagnoseStorageKeys(),
            dataFlow: diagnoseDataFlow(),
            crossRole: checkCrossRoleData()
        };

        // Collect all issues
        const allIssues = [
            ...results.session.issues,
            ...results.storageKeys.issues,
            ...results.dataFlow.issues,
            ...results.crossRole.issues
        ];

        results.summary = {
            totalIssues: allIssues.length,
            criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
            warnings: allIssues.filter(i => i.severity === 'warning').length,
            allIssues: allIssues
        };

        // Print summary
        console.log('%c=== ESG Debug Summary ===', 'color: #4488ff; font-weight: bold;');
        console.log(`Session ID: ${results.session.sessionStorage.session_id || 'NOT SET'}`);
        console.log(`Role: ${results.session.sessionStorage.role || 'NOT SET'}`);
        console.log(`Supabase: ${results.session.supabase.available ? 'Available' : 'Not loaded'}`);
        console.log(`Total Issues: ${results.summary.totalIssues} (${results.summary.criticalIssues} critical)`);

        if (allIssues.length > 0) {
            console.log('%c=== Issues Found ===', 'color: #ff4444; font-weight: bold;');
            allIssues.forEach((issue, i) => {
                const color = issue.severity === 'critical' ? '#ff4444' :
                              issue.severity === 'warning' ? '#ffaa00' : '#888888';
                console.log(`%c${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`, `color: ${color}`);
                if (issue.fix) console.log(`   Fix: ${issue.fix}`);
            });
        }

        console.log('%c=== Full Results ===', 'color: #4488ff; font-weight: bold;');
        console.log(results);

        return results;
    }

    // ==========================================
    // EXPOSE DEBUG API
    // ==========================================

    window.esgDebug = {
        // Diagnosis
        runFullDiagnosis,
        diagnoseSession,
        diagnoseStorageKeys,
        diagnoseDataFlow,
        checkCrossRoleData,

        // Watchers
        startDataWatcher,
        stopDataWatcher,

        // Utilities
        migrateToConsistentKeys,
        forceSessionSync,
        clearAllEsgData,

        // Logging
        setLogLevel: (level) => {
            DEBUG_CONFIG.logLevel = level;
            return `Log level set to: ${level}`;
        },
        enableDebug: () => {
            DEBUG_CONFIG.enabled = true;
            return 'Debug logging enabled';
        },
        disableDebug: () => {
            DEBUG_CONFIG.enabled = false;
            return 'Debug logging disabled';
        },

        // Quick helpers
        getSessionId: () => sessionStorage.getItem('esg_session_id'),
        getRole: () => sessionStorage.getItem('esg_role'),
        getClientId: () => sessionStorage.getItem('esg_client_id'),

        // Version
        version: '1.0.0'
    };

    // Auto-run diagnosis on load if debug param is present
    if (window.location.search.includes('debug=true')) {
        setTimeout(() => {
            console.log('%c[ESG-DEBUG] Auto-running diagnosis (debug=true in URL)', 'color: #4488ff;');
            runFullDiagnosis();
        }, 2000);
    }

    console.log('%c[ESG-DEBUG] Debug helpers loaded. Use window.esgDebug.runFullDiagnosis() to start.', 'color: #4488ff;');

})();
