export default defineEventHandler((event) => {
  const query = getQuery(event)
  return readBuilderConfig(query.token)
})
