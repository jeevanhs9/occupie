from locust import HttpUser, task, between

class OccupieUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def health_check(self):
        self.client.get("/api/health")

    # Future: Add tasks for login, reservation creation as you build auth tokens
