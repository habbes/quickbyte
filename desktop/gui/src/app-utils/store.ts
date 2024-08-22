import { ref } from "vue";
import type { UserWithAccount } from "@quickbyte/common";

const user = ref<UserWithAccount>();


const store = {
    user
};

export { store };
