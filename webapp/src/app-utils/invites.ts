import { ensure } from "@/core";
import { store } from './store';
import { trpcClient } from './api';

export async function acceptInvite(id: string) {
    const user = ensure(store.user.value, 'Expected current user to be set when accepting invite');
    const resource = await trpcClient.acceptInvite.mutate({ id, email: user.email, name: user.name });
    store.removeInvite(id);
    if (resource.type === 'project' && resource.object) {
        store.addProject(resource.object);
    }

    return resource;
}

export async function declineInvite(id: string) {
    const user = ensure(store.user.value, 'Expected current user to be set when declining invite.');
    // optimisitically remove the invite
    store.removeInvite(id);
    await trpcClient.declineInvite.mutate({ id, email: user.email });
}
