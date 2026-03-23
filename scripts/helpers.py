def iter_months(json_data):
    for year in sorted(json_data.keys()):
        raw_key = f"raw_{year}"
        if raw_key not in json_data[year]:
            continue

        months = json_data[year][raw_key]["month"]
        yield year, months


"""
for year, months in iter_months(json_data):
    print(year, months)
"""