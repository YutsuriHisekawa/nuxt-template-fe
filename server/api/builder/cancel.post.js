export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  removeBuilderConfig(body.token)
  return { success: true, message: 'Builder config removed' }
})
