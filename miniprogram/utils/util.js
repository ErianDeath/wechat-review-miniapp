// /utils/util.js
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return [year, month, day].map(n => n.toString().padStart(2, '0')).join('-')
}
module.exports = { formatTime }