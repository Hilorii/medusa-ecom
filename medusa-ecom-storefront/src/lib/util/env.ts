export const getBaseURL = () => {
  return process.env.STORE_CORS || "https://localhost:8000"
}
