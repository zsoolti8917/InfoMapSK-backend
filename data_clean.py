import sys
import requests
import json

def process_data(api_url):
    # Fetch data
    response = requests.get(api_url)
    data = response.json()

    # Data cleaning and visualization code goes here

    # For this example, let's just return the data
    return data

if __name__ == "__main__":
    api_url = sys.argv[1]  # Get API URL from command-line argument
    processed_data = process_data(api_url)
    print(json.dumps(processed_data))  # Print the result so Node.js can capture it