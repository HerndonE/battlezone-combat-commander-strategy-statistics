import json
import os
from collections import defaultdict, Counter

# Define the paths to the JSON files and their corresponding years
files = [
    ('data/Battlezone Combat Commander - VSR Games - 2024.json', 2024),
    ('data/Battlezone Combat Commander - VSR Games - 2025.json', 2025),
]

output_path = 'data/data.json'  # Output path for the combined JSON

# Function to read a JSON file and return the parsed data
def read_file(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

# Function to extract map values and counts
def extract_map_counts(d):
    map_values = []

    def extract_map_values(d, map_values):
        if isinstance(d, dict):
            for key, value in d.items():
                if key == "map":
                    map_values.append(value)
                else:
                    extract_map_values(value, map_values)
        elif isinstance(d, list):
            for item in d:
                extract_map_values(item, map_values)

    extract_map_values(d, map_values)

    unique_map_values = list(set(map_values))

    map_counts = defaultdict(int)
    for value in map_values:
        map_counts[value] += 1

    map_counts_list = sorted(map_counts.items(), key=lambda x: x[1], reverse=True)

    return map_counts_list, unique_map_values

# Function to count commanders
def count_commanders(data):
    commander_count = Counter()

    # Traverse the data and extract the "commanders" information
    for month in data['month'].values():
        for date in month.values():
            for map_data in date.values():
                commanders = map_data['commanders'].split(' vs ')
                commander_count.update(commanders)

    # Convert to a list of tuples (commander, count)
    commander_list = list(commander_count.items())
    commander_list.sort(key=lambda x: x[1], reverse=True)  # Sort by count

    return commander_list

# Function to calculate win percentage and graph
def calculate_win_percentage_and_graph(data):
    commander_stats = defaultdict(lambda: {'commands': 0, 'wins': 0})

    # Traverse the data to calculate the stats for each commander
    for month in data['month'].values():
        for date in month.values():
            for map_data in date.values():
                commanders = map_data['commanders'].split(' vs ')  # Split the commanders
                # Increment command count for each commander
                for commander in commanders:
                    commander_stats[commander]['commands'] += 1
                # Increment win count for the winner
                winner = map_data['winner']
                if winner in commanders:
                    commander_stats[winner]['wins'] += 1

    # Prepare data for sorting and plotting
    commander_win_percentages = []

    # Calculate win percentages and store the data
    for commander, stats in commander_stats.items():
        total_commands = stats['commands']
        wins = stats['wins']
        win_percentage = (wins / total_commands) * 100 if total_commands > 0 else 0
        commander_win_percentages.append((commander, win_percentage, total_commands, wins))

    # Sort the commanders based on win percentage (from high to low)
    commander_win_percentages.sort(key=lambda x: x[1], reverse=True)

    return commander_win_percentages

# Function to calculate the most played factions
def calculate_most_played_faction(data):
    faction_counter = Counter()

    # Traverse the data to count faction appearances
    for month in data['month'].values():
        for date in month.values():
            for map_data in date.values():
                factions = map_data['factions'].strip('[]').split(', ')
                faction_counter.update(factions)  # Update the counter with the factions for this game

    return faction_counter

# Function to count faction plays and wins
def count_faction_plays_and_wins(data):
    commander_faction_counts = defaultdict(lambda: defaultdict(int))
    commander_faction_wins = defaultdict(lambda: defaultdict(int))

    # Traverse through the data
    for month in data['month'].values():
        for date in month.values():
            for map_data in date.values():
                commanders = map_data['commanders'].split(' vs ')  # Extract commanders
                factions = map_data['factions'].strip('[]').split(', ')  # Extract factions
                winning_faction = map_data['winning faction'].strip(',')  # Extract winning faction
                winner = map_data['winner']  # The commander who won the match

                # Ensure the number of commanders and factions match
                if len(commanders) != len(factions):
                    print(f"Warning: Mismatch in commanders and factions for map: {map_data.get('map', 'Unknown')}")
                    continue  # Skip this entry if the number of commanders doesn't match the number of factions

                # Count the number of times each commander played each faction and whether they won
                for i, commander in enumerate(commanders):
                    faction = factions[i]  # The faction each commander played
                    commander_faction_counts[commander][faction] += 1

                    # Check if the commander won this match
                    if commander == winner:
                        commander_faction_wins[commander][faction] += 1

    return commander_faction_counts, commander_faction_wins

# Function to process the data and collect results
def process_file(data, year):
    print(f"Processing {year} data:")

    map_counts_list, unique_map_values = extract_map_counts(data)
    print("Map counts extracted.")

    commander_list = count_commanders(data)
    print(f"Commanders counted: {len(commander_list)}")

    commander_win_percentages = calculate_win_percentage_and_graph(data)
    print("Win percentages calculated.")

    faction_counter = calculate_most_played_faction(data)
    print("Most played factions calculated.")

    commander_faction_counts, commander_faction_wins = count_faction_plays_and_wins(data)
    print("Faction plays and wins counted.")

    return {
        'map_counts': map_counts_list,
        'unique_map_values': unique_map_values,
        'commander_list': commander_list,
        'commander_win_percentages': commander_win_percentages,
        'faction_counter': faction_counter,
        'commander_faction_counts': commander_faction_counts,
        'commander_faction_wins': commander_faction_wins
    }

# Create an empty dictionary to store the output data
output_data = {}

# Loop through each file and process it dynamically
for file_path, year in files:
    file_data = read_file(file_path)  # Read the file data

    # Process the data for the current file
    processed_data = process_file(file_data, year)

    # Group the raw data and processed data under each year
    output_data[year] = {
        f'raw_{year}': file_data,
        f'data_{year}': processed_data
    }

# Add the additional entry for "BZCC-2025-Tournament" with raw data (no processing needed)
bzcc_2025_data = read_file('data/BZCC-2025-Tournament.json')  # Read the raw data file
output_data["BZCC-2025-Tournament"] = {
    "raw": bzcc_2025_data
}

# Write the combined and updated data to data.json
with open(output_path, 'w') as output_file:
    json.dump(output_data, output_file, indent=4)

print(f"Combined and updated JSON data saved to {output_path}")