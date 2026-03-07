import HTMLtoDOCX from 'html-to-docx'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const html = body?.html
  const filename = body?.filename || 'printout.docx'

  if (!html || typeof html !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'HTML is required' })
  }

  const buffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return buffer
})