export interface SomeModel {
    model: number;
}

// TODO: dummy function to test that importing from
// common package works. Will delete after ensuring monorepo is setup correctly.
export function someFun(a: SomeModel): number {
    return a.model * 2;
}