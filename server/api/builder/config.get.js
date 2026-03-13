export default defineEventHandler(async (event) => {
  await verifyBuilderKey(event)
  const query = getQuery(event)
  return readBuilderConfig(query.token)
})
