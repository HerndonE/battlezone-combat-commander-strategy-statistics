import combine_json
import config
import json

# Write the combined and updated data to data.json
with open(config.output_path, 'w') as output_file:
    json.dump(combine_json.process_games(), output_file, indent=4)


print(f"Combined and updated JSON data saved to {config.output_path}")
