import { provide, inject } from "vue";
import type { InjectionKey } from "vue";
import type { FolderPathEntry } from "@quickbyte/common";

type FolderPathSetter = (path: FolderPathEntry[]) => unknown;
const FolderPathSetterKey = Symbol() as InjectionKey<FolderPathSetter>;

export function providerFolderPathSetter(setter: FolderPathSetter) {
    provide(FolderPathSetterKey, setter);
}

export function injectFolderPathSetter(): FolderPathSetter|undefined {
    return inject(FolderPathSetterKey);
}

