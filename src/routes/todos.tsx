import {
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  Spinner,
  TextField,
} from "@heroui/react"
import { createFileRoute } from "@tanstack/react-router"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { lofi } from "#/db/lofi"

export const Route = createFileRoute("/todos")({ component: Todos })

function addTodo(text: string) {
  lofi.insertItem("todos", {
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: new Date(),
  })
}

function toggleTodo(todoId: string, done: boolean) {
  lofi.updateItem("todos", todoId, { done: !done })
}

function deleteTodo(todoId: string) {
  lofi.deleteItem("todos", todoId)
}

function Todos() {
  const [text, setText] = useState("")
  const { isLoading, status, isError, data } = lofi.useFindMany("todos", {
    orderBy: { createdAt: "desc" },
  })

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    addTodo(trimmed)
    setText("")
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-6 py-16">
      <main className="w-full max-w-xl">
        <Card className="p-8">
          <Card.Header>
            <Card.Title className="text-2xl">Todos</Card.Title>
            <Card.Description>
              A simple todo list backed by InstantDB. Changes sync in real time.
            </Card.Description>
          </Card.Header>

          <Card.Content className="flex gap-3">
            <TextField className="flex-1" value={text} onChange={setText}>
              <Label className="sr-only">New todo</Label>
              <Input
                placeholder="What needs doing?"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </TextField>
            <Button variant="primary" onPress={submit}>
              <Plus size={16} />
              Add
            </Button>
          </Card.Content>

          <Card.Content className="mt-4">
            {isLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {isError && (
              <p className="py-4 text-center text-danger">
                Error: {String(status)}
              </p>
            )}
            {data?.length === 0 && (
              <p className="py-8 text-center text-muted">
                Nothing yet. Add your first todo above.
              </p>
            )}
            <div className="space-y-1">
              {data?.map((todo) => (
                <div
                  key={todo.id}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-secondary"
                >
                  <Checkbox
                    isSelected={todo.done}
                    onChange={() => toggleTodo(todo.id, todo.done)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span
                        className={todo.done ? "text-muted line-through" : ""}
                      >
                        {todo.text}
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                  <Button
                    isIconOnly
                    className="ml-auto opacity-0 group-hover:opacity-100"
                    size="sm"
                    variant="ghost"
                    onPress={() => deleteTodo(todo.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </main>
    </div>
  )
}
