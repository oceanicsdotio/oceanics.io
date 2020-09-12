build:
	mkdir -p functions
	echo ${GOOGLE_CREDENTIALS} > functions/credentials.json
	GOOS=linux
	GOARCH=amd64
	GO111MODULE=on
	GOBIN=${PWD}/functions go get ./...
	GOBIN=${PWD}/functions go install ./...
	yarn build