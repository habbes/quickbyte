import { auth, initUserData } from "@/app-utils";
import type { AuthToken } from "@quickbyte/common";
import type { Router } from "vue-router";

export async function loginUserFromToken(token: AuthToken, router: Router) {
    auth.setToken(token);
    await initUserData();
    const route = router.currentRoute;
    if (route.value.query.next) {
        const next = route.value.query.next;
        router.push(Array.isArray(next) ? next[0] as string : next);
        return;
    }

    router.push({ name: 'projects' });
}