import Fastify from "fastify";
import { stratifyCardiovascularRisk, type Patient } from "@cardiorehab/clinical-core";

const server = Fastify({ logger: true });

server.get("/health", async () => ({ status: "ok", service: "cardiorehab-api" }));

server.post<{ Body: Patient }>("/risk-assessments", async (request) => {
  return stratifyCardiovascularRisk(request.body);
});

server.post("/reports", async () => {
  return {
    status: "queued",
    message: "Geracao de PDF sera conectada ao servico de relatorios."
  };
});

const port = Number(process.env.PORT ?? 3333);

server.listen({ host: "0.0.0.0", port }).catch((error) => {
  server.log.error(error);
  process.exit(1);
});

