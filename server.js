import Fastify from 'fastify';
import { DatabaseMemory } from './database-memory.js';

const server = Fastify()

const database = new DatabaseMemory();

server.post('/usuarios', async (request, reply) => {

    const { nome, email } = request.body

    database.create({
        nome,
        email,
    }),

  console.log(database.list());

  return reply.status(201).send();
})

server.get('/usuarios', async (request, reply) => {
    const { search } = request.query

    const usuarios = database.list(search);

    console.log(usuarios);

  return usuarios;
})

server.put('/usuarios/:id', async (request, reply) => {
  const { id } = request.params
  const { nome, email } = request.body

  database.update(id, { nome, email })

  return database.list()
})

server.delete('/usuarios/:id', async (request, reply) => {
  const { id } = request.params

  database.delete(id)

  return database.list()
})

server.listen({
    port: 3000,
})