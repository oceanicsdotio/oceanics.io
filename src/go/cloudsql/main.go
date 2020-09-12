package main

import (
	"fmt"
	"os"
	"log"
	"database/sql"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	_ "github.com/GoogleCloudPlatform/cloudsql-proxy/proxy/dialers/postgres"

)

// Handler gets some Postgres data
func Handler(request events.APIGatewayProxyRequest) (*events.APIGatewayProxyResponse, error) {

	dsn := fmt.Sprintf("host=%s dbname=%s user=%s password=%s sslmode=disable",
                   os.Getenv("INSTANCE_CONNECTION_NAME"),
                   os.Getenv("DATABASE_NAME"),
                   os.Getenv("DATABASE_USER"),
				   os.Getenv("PASSWORD"))
				   
	db, err := sql.Open("cloudsqlpostgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	
	err = db.Ping()
	if err != nil {
		log.Fatal(err)
	}

	stmt, err := db.Prepare("select now()")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()
	var time string
	err = stmt.QueryRow(1).Scan(&time)
	if err != nil {
		log.Fatal(err)
	}
	
	response := fmt.Sprintf("The time is %s", time)

	return &events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    map[string]string{"Content-Type": "text/html; charset=UTF-8"},
		Body:       response,
	}, nil
}

func main() {
	// Initiate AWS Lambda handler
	lambda.Start(Handler)
}