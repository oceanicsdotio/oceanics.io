build:
	mkdir -p functions
	echo ${GOOGLE_CREDENTIALS} > ${PWD}/functions/cloudsql/credentials.json
	GOOS=linux
	GOARCH=amd64
	GO111MODULE=on
	GOBIN=${PWD}/functions/cloudsql go get ./...
	GOBIN=${PWD}/functions/cloudsql go install ./...
	yarn build