import test from 'node:test'
import assert from 'node:assert/strict'

import { textResult, toolDefinitions } from './mcp-core.mjs'

test('textResult serializes JSON compactly', () => {
  const result = textResult({ ok: true, value: 1 })

  assert.equal(result.content[0].text, '{"ok":true,"value":1}')
})

test('get_board_state requires explicit expensive-read confirmation', async () => {
  const tool = toolDefinitions.find((item) => item.name === 'get_board_state')

  await assert.rejects(
    () => tool.handler({}),
    /confirmExpensive: true/,
  )
})

test('agent TODO tools are registered', () => {
  const names = new Set(toolDefinitions.map((tool) => tool.name))

  for (const name of [
    'ensure_task',
    'append_task_note',
    'start_task',
    'complete_task',
    'block_task',
    'reopen_task',
    'get_agent_digest',
    'apply_task_changes',
  ]) {
    assert.equal(names.has(name), true, `${name} should be registered`)
  }
})
