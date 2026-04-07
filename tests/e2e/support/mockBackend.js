const SESSION_KEYS = [
    'esg_session_id',
    'esg_role',
    'esg_user_name',
    'esg_session_data'
];

export async function enableE2EMockBackend(context) {
    await context.addInitScript(({ sessionKeys }) => {
        globalThis.__ESG_E2E_MOCK__ = true;

        const storage = globalThis.localStorage;
        const sessionStorageRef = globalThis.sessionStorage;

        storage.setItem('esg_e2e_mock', 'enabled');

        if (!sessionStorageRef.getItem('__esg_e2e_bootstrapped__')) {
            storage.removeItem('esg_e2e_backend_state');
            sessionKeys.forEach((key) => storage.removeItem(key));
            sessionStorageRef.setItem('__esg_e2e_bootstrapped__', 'true');
        }
    }, {
        sessionKeys: SESSION_KEYS
    });
}

export async function dumpE2EMockBackend(page) {
    return page.evaluate(() => globalThis.__ESG_E2E_BACKEND__?.dump?.() ?? null);
}
