import crypto from 'node:crypto'

export class DatabaseMemory {
    #usuarios = new Map()

    list(search) {
        return Array.from(this.#usuarios.entries()).map(([id, usuario]) => {
            return {
                id,
                ...usuario,
            }
        }).filter(usuario => {
            if (search) {
                return usuario.nome.includes(search)
            }
            return true
        })
    }

    create(usuario) {
        const id = crypto.randomUUID()

        this.#usuarios.set(id, usuario)
    }

    update(id, usuario) {
        this.#usuarios.set(id, usuario)
    }

    delete(id) {
        this.#usuarios.delete(id)
    }
}