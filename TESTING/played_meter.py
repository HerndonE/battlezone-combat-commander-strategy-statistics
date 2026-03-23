import json
from collections import defaultdict
from helpers import iter_months


def build_bzcc_stats(json_data):

    commander_stats = defaultdict(lambda: {"wins": 0, "matches": 0})
    player_global = defaultdict(lambda: {"wins": 0, "matches": 0})
    player_commander = defaultdict(lambda: defaultdict(lambda: {"wins": 0, "matches": 0}))

    for year, months in iter_months(json_data):

        for month in months.values():
            for day in month.values():
                for match_name, match in day.items():

                    team1 = [p for p in match.get("teamOne", []) if p and p.strip() and p != "NA"]
                    team2 = [p for p in match.get("teamTwo", []) if p and p.strip() and p != "NA"]

                    commanders = match.get("commanders", "")

                    if " vs " not in commanders:
                        continue

                    commander1, commander2 = [c.strip() for c in commanders.split(" vs ")]

                    winner = match.get("winner")

                    # determine winning team
                    team1_won = winner == commander1
                    team2_won = winner == commander2

                    # commander stats
                    commander_stats[commander1]["matches"] += 1
                    commander_stats[commander2]["matches"] += 1

                    if team1_won:
                        commander_stats[commander1]["wins"] += 1
                    elif team2_won:
                        commander_stats[commander2]["wins"] += 1

                    # player global stats
                    for p in team1:
                        player_global[p]["matches"] += 1
                        if team1_won:
                            player_global[p]["wins"] += 1

                    for p in team2:
                        player_global[p]["matches"] += 1
                        if team2_won:
                            player_global[p]["wins"] += 1

                    # player under commander
                    for p in team1:
                        player_commander[commander1][p]["matches"] += 1
                        if team1_won:
                            player_commander[commander1][p]["wins"] += 1

                    for p in team2:
                        player_commander[commander2][p]["matches"] += 1
                        if team2_won:
                            player_commander[commander2][p]["wins"] += 1

    # Convert to win rates
    commander_rates = {}
    for c, stats in commander_stats.items():
        if stats["matches"] == 0:
            continue

        commander_rates[c] = {
            "win_rate": stats["wins"] / stats["matches"],
            "wins": stats["wins"],
            "matches": stats["matches"]
        }

    player_global_rates = {}
    for p, stats in player_global.items():

        if stats["matches"] == 0:
            continue

        player_global_rates[p] = {
            "win_rate": stats["wins"] / stats["matches"],
            "wins": stats["wins"],
            "matches": stats["matches"]
        }

    # final dataset
    final_data = {
        "commanders": commander_rates,
        "players": player_global_rates,
        "player_commander": player_commander
    }

    return final_data


if __name__ == "__main__":
    with open(f"data\\data.json") as f:
        data = json.load(f)

    stats = build_bzcc_stats(data)

    with open("data/played_meter.json", "w") as f:
        json.dump(stats, f, indent=4)





