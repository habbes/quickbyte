import { ref } from "vue";

// TODO store token elsewhere
const authToken = ref<string>();


function setToken(token: string) {
    authToken.value = token;
}

function deleteToken() {
    authToken.value = undefined;
}

function getToken() {
    return authToken.value;
}

export { setToken, deleteToken, getToken  };
