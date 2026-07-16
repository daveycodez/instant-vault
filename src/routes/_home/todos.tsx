import { Plus, TrashBin } from "@gravity-ui/icons"
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
import { useState } from "react"
import { lofi } from "@/db/lofi"

export const Route = createFileRoute("/_home/todos")({ component: Todos })

function addTodo(text: string) {
  lofi.insertItem("todos", {
    id: crypto.randomUUID(),
    text,
    done: false,
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
    <div className="flex items-start justify-center px-6 py-16">
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
              <Plus />
              Add
            </Button>
          </Card.Content>

          <Card.Content>
            {isLoading ? (
              <Spinner size="sm" />
            ) : status === "error" || isError ? (
              <p className="text-sm text-danger">
                Failed to load todos. Try refreshing.
              </p>
            ) : (
              <ul className="space-y-2">
                {data?.map((todo) => (
                  <li
                    key={todo.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        isSelected={todo.done}
                        onChange={() => toggleTodo(todo.id, todo.done)}
                        aria-label={`Mark "${todo.text}" as ${todo.done ? "incomplete" : "complete"}`}
                      />
                      <span
                        className={`text-sm ${todo.done ? "text-muted line-through" : ""}`}
                      >
                        {todo.text}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete "${todo.text}"`}
                      onPress={() => deleteTodo(todo.id)}
                    >
                      <TrashBin size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
        </Card>
      </main>
    </div>
  )
}
