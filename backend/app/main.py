from fastapi import FastAPI

app = FastAPI(title="Predictive Maintenance API")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
