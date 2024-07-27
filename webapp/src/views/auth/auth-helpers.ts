import { auth, initUserData, trpcClient } from "@/app-utils";
import type { AuthToken } from "@quickbyte/common";
import { ensure, unwrapSingleton } from "@/core";
import type { Router } from "vue-router";

export async function loginUserFromCredentials(email: string, password: string, router: Router) {
    const result = await trpcClient.login.mutate({
        email,
        password
    });

    if ('authToken' in result) {
        await loginUserFromToken(result.authToken, router);
    }

    return result;
}

export async function loginUserFromToken(token: AuthToken, router: Router) {
    auth.setToken(token);
    await initUserData(router);
    const route = router.currentRoute;
    if (route.value.query.next) {
        const next = ensure(unwrapSingleton(route.value.query.next));
        // vue-router does not seem to handle automatic encode/decode of URL params
        const decodedNext = decodeURIComponent(next);
        router.push(decodedNext);
        return;
    }

    router.push({ name: 'projects' });
}
