def count_errors(result):
    count = sum(item["status"] == "error" for item in result)
    assert count == 0, f"There were {count} errors."
