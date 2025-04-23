let baseURL = 'http://localhost';

const configurarAPI = async () => {
    const puerto = await window.electronAPI.getServerPort();
    return axios.create({
        baseURL: `${baseURL}:${puerto}`
    });
};

const api = await configurarAPI();
api.get('/endpoint');