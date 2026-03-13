export default defineEventHandler(async (event) => {
  await verifyBuilderKey(event)
  const body = await readBody(event)
  removeBuilderConfig(body.token)
  return { success: true, message: 'Builder config removed' }
})
