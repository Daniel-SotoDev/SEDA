const configurarAPI = async () => {
    const puerto = await window.electronAPI.getServerPort();
    const host = window.location.hostname || "127.0.0.1";
    return axios.create({
        baseURL: `http://${host}:${puerto}`
    });
};

const api = await configurarAPI();
api.get('/endpoint');