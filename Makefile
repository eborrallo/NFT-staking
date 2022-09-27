IMAGE_NAME := hardhat
SERVICE_NAME := app


DOCKER := $(shell command -v docker)
DOCKER_COMPOSE := $(shell command -v docker-compose)
deps:
ifndef DOCKER
	@echo "Docker is not available. Please install docker"
	@exit 1
endif
ifndef DOCKER_COMPOSE
	@echo "docker-compose is not available. Please install docker-compose"
	@exit 1
endif


# Build image
build:
	docker build -t $(IMAGE_NAME):dev .

# Run tests
test: build
	docker-compose run --rm $(SERVICE_NAME) sh -c 'npm run test'

# Clean containers
clean:
	docker-compose down --rmi local --volumes --remove-orphans
