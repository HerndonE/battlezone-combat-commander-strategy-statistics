import json
import os
from collections import defaultdict, Counter
from datetime import datetime

# Note:    Scrap Harvested (Recycler) and Scrap Harvested (Extractor) not collected

# Define the paths to the JSON files and their corresponding years
files = [
    ('data/Battlezone Combat Commander - VSR Games - 2024.json', 2024),
    ('data/Battlezone Combat Commander - VSR Games - 2025.json', 2025),
    ('data/Battlezone Combat Commander - VSR Games - 2026.json', 2026),
]

output_path = 'data/data.json'  # Output path for the combined JSON


# Function to read a JSON file and return the parsed data
def read_file(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)


def time_to_seconds(t):
    if not t or t == "NA":
        return 0

    parts = list(map(int, t.split(":")))

    if len(parts) == 2:  # MM:SS
        minutes, seconds = parts
        return minutes * 60 + seconds
    elif len(parts) == 3:  # H:MM:SS
        hours, minutes, seconds = parts
        return hours * 3600 + minutes * 60 + seconds
    else:
        raise ValueError(f"Invalid time format: {t}")


def format_time(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60

    if hours:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


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
                winning_faction = map_data['winningFaction'].strip(',')  # Extract winning faction
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


def count_game_times(json_data):
    get_months = json_data["month"]

    total_seconds = 0
    times = []
    time_list = []

    shortest_match = None
    longest_match = None
    shortest_time = float("inf")
    longest_time = 0

    for month in get_months.values():
        for day in month.values():
            for match in day.values():
                t = match.get("time")

                if not t or t == "NA":
                    continue

                seconds = time_to_seconds(t)

                times.append(seconds)
                total_seconds += seconds

                if seconds < shortest_time:
                    shortest_time = seconds
                    shortest_match = match

                if seconds > longest_time:
                    longest_time = seconds
                    longest_match = match

    if not times:
        print("No valid game times found.")
        return

    count = len(times)

    mean_seconds = total_seconds / count

    sorted_times = sorted(times)
    mid = count // 2
    if count % 2 == 1:
        median_seconds = sorted_times[mid]
    else:
        median_seconds = (sorted_times[mid - 1] + sorted_times[mid]) / 2

    counts = Counter(times)
    most_common_time, freq = counts.most_common(1)[0]
    mode_seconds = most_common_time if freq > 1 else None

    range_seconds = max(times) - min(times)

    time_list.append([["Total Time", format_time(total_seconds)], ["Mean", format_time(int(mean_seconds))],
                      ["Median", format_time(int(median_seconds))], ["Range", format_time(range_seconds)]])

    if mode_seconds is not None:
        time_list.append(["Mode", format_time(mode_seconds)])
    else:
        time_list.append(["Mode: No mode (all values unique)", ""])

    time_list.append([["Shortest Match", format_time(shortest_time)], [shortest_match], ["Longest Match",
                                                                                         format_time(longest_time)],
                      [longest_match]])

    return time_list


def count_game_totals(json_data):

    months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ]

    get_months = json_data["month"]

    count_total_days_in_year, count_total_games_in_year = 0, 0
    months_list = []

    for i in range(len(months)):
        if get_months.get(months[i]) is not None:
            count_total_days_in_year += len(get_months[months[i]])  # days
            count_games = {day: len(matches) for day, matches in get_months[months[i]].items()}
            count_total_games_in_year += sum(count_games.values())
            months_list.append([months[i], count_games, {"Day(s) Played": len(get_months[months[i]])},
                                {"Game(s) Played": sum(count_games.values())}])

    months_list.append(
        [{f"Total Days Played": count_total_days_in_year}, {f"Total Games Played": count_total_games_in_year}])
    return months_list


def print_player_times(json_data):
    player_times = defaultdict(int)
    last_played = {}
    player_factions = defaultdict(lambda: defaultdict(int))  # Tracks faction counts

    def parse_date(date_obj):
        m, d, y = date_obj.split(".")
        y = int(y) + 2000
        return datetime(y, int(m), int(d))

    def time_to_seconds_in_func(time_str):
        if not time_str or not time_str.replace(":", "").isdigit():
            return 0  # Handle None, "NA", or other non-numeric times
        parts = list(map(int, time_str.split(":")))
        if len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        return 0

    for year in sorted(json_data.keys()):
        raw_key = f"raw_{year}"

        if raw_key not in json_data[year]:
            continue

        months = json_data[year][raw_key]["month"]

        for month in months.values():
            for day in month.values():
                for match in day.values():
                    raw_time = match.get("time")
                    seconds = time_to_seconds_in_func(raw_time)
                    if seconds == 0:
                        continue

                    date_str = match.get("date")
                    match_date = parse_date(date_str) if date_str else None

                    team1 = match.get("teamOne", [])
                    team2 = match.get("teamTwo", [])

                    # Parse factions (expected format: "[I.S.D.F, Scion]")
                    factions = match.get("factions", "")
                    factions = factions.strip("[]").split(",")
                    factions = [f.strip() for f in factions]
                    if len(factions) < 2:  # Skip if malformed
                        team1_faction = team2_faction = "Unknown"
                    else:
                        team1_faction, team2_faction = factions[0], factions[1]

                    for player in team1:
                        if not player:
                            continue
                        player = player.strip()
                        if not player:
                            continue
                        player_times[player] += seconds
                        player_factions[player][team1_faction] += 1
                        if match_date and (player not in last_played or match_date > last_played[player]):
                            last_played[player] = match_date

                    for player in team2:
                        if not player:
                            continue
                        player = player.strip()
                        if not player:
                            continue
                        player_times[player] += seconds
                        player_factions[player][team2_faction] += 1
                        if match_date and (player not in last_played or match_date > last_played[player]):
                            last_played[player] = match_date

    now = datetime.now()

    get_player_count = []
    get_player_info = []

    for player, total_seconds in sorted(player_times.items(), key=lambda x: x[1], reverse=True):
        get_player_count.append(player)

        last_date = last_played.get(player)
        if last_date:
            months_inactive = (now.year - last_date.year) * 12 + (now.month - last_date.month)
            if months_inactive <= 3:
                status = "Active"
            elif months_inactive <= 9:
                status = "Semi-Active"
            else:
                status = "Inactive"
            last_str = last_date.date()
        else:
            status = "Unknown"
            last_str = "N/A"

        # Show all factions played with counts, sorted by count
        factions_count = player_factions[player]
        if factions_count:
            sorted_factions = sorted(factions_count.items(), key=lambda x: x[1], reverse=True)
            faction_str = ", ".join(f"[{faction} : {count}]" for faction, count in sorted_factions)
        else:
            faction_str = "N/A"

        get_player_info.append([{"Player": player, "Total Time": format_time(total_seconds), "Status": status,
                                 "Last Played": last_str.strftime('%Y-%m-%d'), "Factions Played": faction_str}])

    get_player_info.append([f"Total Players: {len(get_player_count)}"])

    return get_player_info


def print_commander_times(json_data):
    total_time = defaultdict(int)  # commander -> total seconds (timed only)
    timed_matches = defaultdict(int)  # commander -> matches with real time
    all_matches = defaultdict(int)  # commander -> all matches (incl NA)
    first_year = {}  # commander -> the earliest year seen

    for year in sorted(json_data.keys()):
        raw_key = f"raw_{year}"

        if raw_key not in json_data[year]:
            continue

        data = json_data[year][raw_key]["month"]

        for month in data.values():
            for day in month.values():
                for match in day.values():
                    t = match.get("time")
                    c = match.get("commanders")

                    if not c:
                        continue

                    commanders = [name.strip() for name in c.split("vs")]

                    for commander in commanders:
                        # record earliest year commanding
                        if commander not in first_year:
                            first_year[commander] = year

                        # always count the match, even if time is NA
                        all_matches[commander] += 1

                    # skip time accumulation if NA
                    if not t or t == "NA":
                        continue

                    seconds = time_to_seconds(t)

                    for commander in commanders:
                        total_time[commander] += seconds
                        timed_matches[commander] += 1

    # sort by most total time to least (NA-only commanders end up at bottom)
    sorted_commanders = sorted(
        first_year.keys(),
        key=lambda c: total_time[c],
        reverse=True
    )

    # print("\nCommander stats (all years)")
    # print("-" * 70)
    # print(f"{'Commander':<22} {'Total':>8} {'Avg':>8} {'First Year On Record':>12}")
    # print("-" * 70)

    get_commander_info = []

    for commander in sorted_commanders:
        total_seconds = total_time[commander]
        timed_count = timed_matches[commander]

        avg_seconds = total_seconds // timed_count if timed_count > 0 else 0

        get_commander_info.append([{"Commander": commander, "Total Time": format_time(total_seconds),
                                    "Average Time": format_time(avg_seconds),
                                    "First Year on Record": first_year[commander]}])

        '''
        print(
            f"{commander:<22} "
            f"{format_time(total_seconds):>8} "
            f"{format_time(avg_seconds):>8} "
            f"{first_year[commander]:>12}"
        )
        '''

    get_commander_info.append([f"Total Commanders: {len(sorted_commanders)}"])
    return get_commander_info


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

    game_times = count_game_times(data)
    print("Game times counted.")

    game_totals = count_game_totals(data)
    print("Game totals counted.")

    return {
        'map_counts': map_counts_list,
        'unique_map_values': unique_map_values,
        'commander_list': commander_list,
        'commander_win_percentages': commander_win_percentages,
        'faction_counter': faction_counter,
        'commander_faction_counts': commander_faction_counts,
        'commander_faction_wins': commander_faction_wins,
        'game_times': game_times,
        'game_totals': game_totals
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


def process_map_counts(data):
    keys = list(data.keys())
    combined_counts = {}

    # Iterate through each key and its corresponding "map_counts"
    for key in keys:
        map_counts = data[key][f"data_{key}"]["map_counts"]
        for location, count in map_counts:
            if location in combined_counts:
                combined_counts[location] += count
            else:
                combined_counts[location] = count

    combined_counts = dict(sorted(combined_counts.items(), key=lambda x: x[1], reverse=True))
    return combined_counts


def process_most_played_factions(data):
    keys = list(data.keys())
    combined_counts = {}

    # Iterate through each key and its corresponding "map_counts"
    for key in keys:
        faction_counts = data[key][f"data_{key}"]["faction_counter"]
        # If it's the first entry, initialize combined_counts with faction counts
        if not combined_counts:
            combined_counts = faction_counts.copy()
        else:
            # Otherwise, add the counts from the current faction counter
            for faction, count in faction_counts.items():
                combined_counts[faction] = combined_counts.get(faction, 0) + count

    result = dict(combined_counts)
    return result


def process_commander_faction_counts(data):
    keys = list(data.keys())
    combined_counts = {}

    # Iterate through each key and its corresponding "commander_faction_counts"
    for key in keys:
        commander_faction_counts = data[key][f"data_{key}"]["commander_faction_counts"]

        for commander, factions in commander_faction_counts.items():
            if commander not in combined_counts:
                combined_counts[commander] = {}

            for faction, count in factions.items():
                if faction in combined_counts[commander]:
                    combined_counts[commander][faction] += count
                else:
                    combined_counts[commander][faction] = count

    return combined_counts


def process_commander_win_percentages(data):
    combined_counts = {}

    # Iterate through each key in the data
    for key in data:
        # Extract the "commander_win_percentages" from the nested structure
        commander_faction_counts = data[key][f"data_{key}"]["commander_win_percentages"]

        # Combine the win percentages
        for commander, win_percentage, total_games, wins in commander_faction_counts:
            if commander in combined_counts:
                combined_counts[commander]['total_games'] += total_games
                combined_counts[commander]['total_wins'] += wins
            else:
                combined_counts[commander] = {'total_games': total_games, 'total_wins': wins}

    # Calculate the win percentage for each commander
    combined_commander_win_percentages = []
    for commander, stats in combined_counts.items():
        total_games = stats['total_games']
        total_wins = stats['total_wins']
        win_percentage = (total_wins / total_games) * 100 if total_games > 0 else 0
        combined_commander_win_percentages.append((commander, win_percentage, total_games, total_wins))

    # Sort the commanders based on win percentage (from high to low)
    combined_commander_win_percentages.sort(key=lambda x: x[1], reverse=True)

    return combined_commander_win_percentages


def process_commander_list(data):
    combined_counts = {}

    # Iterate through each key in the data
    for key in data:
        # Extract the "commander_list" for the current key
        commander_list = data[key][f"data_{key}"]["commander_list"]

        # Iterate through each commander in the list
        for commander, count in commander_list:
            # Add the count to the corresponding commander's total
            if commander in combined_counts:
                combined_counts[commander] += count
            else:
                combined_counts[commander] = count

    # Convert the dictionary to a list of tuples if needed
    combined_list = sorted(combined_counts.items(), key=lambda x: x[1], reverse=True)
    return combined_list


def categorize_maps(map_counts):
    sorted_counts = sorted(map_counts.values(), reverse=True)

    total_maps = len(sorted_counts)

    # Define the thresholds for each category based on the number of maps
    very_popular_threshold = int(total_maps * 0.25)  # Top 25%
    mostly_popular_threshold = int(total_maps * 0.5)  # Top 50%
    moderately_popular_threshold = int(total_maps * 0.75)  # Top 75%

    categories = {
        "Very Popular": [],
        "Mostly Popular": [],
        "Moderately Popular": [],
        "Least Popular": []
    }

    sorted_map_names = sorted(map_counts, key=map_counts.get, reverse=True)

    # Categorize based on the thresholds
    for i, map_name in enumerate(sorted_map_names):
        if i < very_popular_threshold:
            categories["Very Popular"].append(map_name)
        elif i < mostly_popular_threshold:
            categories["Mostly Popular"].append(map_name)
        elif i < moderately_popular_threshold:
            categories["Moderately Popular"].append(map_name)
        else:
            categories["Least Popular"].append(map_name)

    return categories


output_data["processed_data"] = {
    "processed_map_counts": process_map_counts(output_data),
    "processed_most_played_factions": process_most_played_factions(output_data),
    "processed_commander_faction_counts": process_commander_faction_counts(output_data),
    "processed_commander_win_percentages": process_commander_win_percentages(output_data),
    "processed_commander_list": process_commander_list(output_data),
    "processed_map_popularity": categorize_maps(process_map_counts(output_data)),
    "processed_player_times": print_player_times(output_data),
    "processed_commander_times": print_commander_times(output_data)
}


# Add the additional entry for "BZCC-2025-Tournament" with raw data (no processing needed)
bzcc_2025_data = read_file('data/BZCC-2025-Tournament.json')  # Read the raw data file
output_data["BZCC-2025-Tournament"] = {
    "raw": bzcc_2025_data['month'],
    "most_played_maps": bzcc_2025_data['most_played_maps'],
    "game_times": bzcc_2025_data["game_times"],
    "popular_matchups": bzcc_2025_data["popular_matchups"],
    "faction_counts": bzcc_2025_data["faction_counts"]
}


def get_timestamp():
    # Get the current time in UTC
    now = datetime.utcnow()

    # Format the timestamp as YYYY/MM/DD HH:MM UTC
    timestamp = now.strftime('%Y/%m/%d %H:%M%p UTC')

    return timestamp


output_data["last_updated"] = get_timestamp()

# Write the combined and updated data to data.json
with open(output_path, 'w') as output_file:
    json.dump(output_data, output_file, indent=4)

print(f"Combined and updated JSON data saved to {output_path}")

