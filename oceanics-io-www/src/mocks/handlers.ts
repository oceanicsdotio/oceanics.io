import { http, HttpResponse } from 'msw';

const handlers = [
    http.get("/api/auth", () => {
        return HttpResponse.json({
            token: "token_data"
        }, {
            status: 200
        })
    }),

    http.post("/api/auth", () => {
        return HttpResponse.json({
            message: "Registered"
        }, {
            status: 200
        })
    })
]

export default handlers;