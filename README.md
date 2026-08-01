import random

def print_board(board):
    print()
    for i in range(3):
        row = board[i*3:i*3+3]
        print(" " + " | ".join(row))
        if i < 2:
            print("---+---+---")
    print()


def check_winner(board):
    wins = [
        (0, 1, 2), (3, 4, 5), (6, 7, 8),
        (0, 3, 6), (1, 4, 7), (2, 5, 8),
        (0, 4, 8), (2, 4, 6),
    ]
    for a, b, c in wins:
        if board[a] != " " and board[a] == board[b] == board[c]:
            return board[a]
    if " " not in board:
        return "draw"
    return None


def computer_move(board, computer_symbol, player_symbol):
    empty = [i for i, cell in enumerate(board) if cell == " "]

    for i in empty:
        test = board.copy()
        test[i] = computer_symbol
        if check_winner(test) == computer_symbol:
            return i

    for i in empty:
        test = board.copy()
        test[i] = player_symbol
        if check_winner(test) == player_symbol:
            return i

    if 4 in empty:
        return 4

    return random.choice(empty)


def get_player_move(board):
    while True:
        raw = input("Твой ход (1-9): ").strip()
        if not raw.isdigit():
            print("Введи число от 1 до 9.")
            continue
        pos = int(raw) - 1
        if pos < 0 or pos > 8:
            print("Число должно быть от 1 до 9.")
            continue
        if board[pos] != " ":
            print("Эта клетка уже занята.")
            continue
        return pos


def play_round():
    board = [" "] * 9
    player_symbol = "X"
    computer_symbol = "O"
    turn = "player"

    print("Клетки нумеруются так:")
    print_board([str(i + 1) for i in range(9)])

    while True:
        if turn == "player":
            pos = get_player_move(board)
            board[pos] = player_symbol
        else:
            pos = computer_move(board, computer_symbol, player_symbol)
            board[pos] = computer_symbol
            print(f"Компьютер ходит в клетку {pos + 1}")

        print_board(board)
        result = check_winner(board)

        if result == "draw":
            print("Ничья!")
            return "draw"
        elif result == player_symbol:
            print("Ты выиграл!")
            return "player"
        elif result == computer_symbol:
            print("Компьютер выиграл!")
            return "computer"

        turn = "computer" if turn == "player" else "player"


def main():
    print("=== Крестики-нолики ===")
    print("Ты играешь за X, компьютер за O.")

    score = {"player": 0, "computer": 0, "draw": 0}

    while True:
        result = play_round()
        score[result] += 1
        print(f"Счёт — ты: {score['player']}, компьютер: {score['computer']}, ничьи: {score['draw']}")

        again = input("Сыграть ещё раз? (y/n): ").strip().lower()
        if again != "y":
            print("Спасибо за игру!")
            break


if __name__ == "__main__":
    main()
