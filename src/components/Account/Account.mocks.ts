import { http, HttpResponse } from 'msw';

const get = http.get("/api/auth", () => {
    return HttpResponse.json({
        token: "token_data"
    }, {
        status: 200
    })
})

const post = http.post("/api/auth", () => {
    return HttpResponse.json({
        message: "Registered"
    }, {
        status: 200
    })
})

const handlers = [get, post]
export default handlers;