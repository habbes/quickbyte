import { onMounted } from "vue";
import { onBeforeRouteUpdate, useRoute, type RouteLocationNormalizedLoaded } from "vue-router";

export function onMountedOrRouteUpdate(handler: (to: RouteLocationNormalizedLoaded) => any) {
    const route = useRoute();
    onMounted(handler(route));
    onBeforeRouteUpdate(handler);
}