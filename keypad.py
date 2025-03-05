import tkinter as tk

class Keypad(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Keypad")
        self.geometry("300x400")

        self.input_var = tk.StringVar()

        self.create_widgets()

    def create_widgets(self):
        entry = tk.Entry(self, textvariable=self.input_var, font=("Arial", 24), justify="center")
        entry.grid(row=0, column=0, columnspan=3, ipadx=10, ipady=10, pady=10)

        buttons = [
            ('1', 1, 0), ('2', 1, 1), ('3', 1, 2),
            ('4', 2, 0), ('5', 2, 1), ('6', 2, 2),
            ('7', 3, 0), ('8', 3, 1), ('9', 3, 2),
            ('0', 4, 1), ('Clear', 4, 0), ('Enter', 4, 2)
        ]

        for text, row, col in buttons:
            btn = tk.Button(self, text=text, font=("Arial", 18), width=5, height=2, command=lambda t=text: self.on_button_press(t))
            btn.grid(row=row, column=col, padx=5, pady=5)

    def on_button_press(self, key):
        if key == "Clear":
            self.input_var.set("")
        elif key == "Enter":
            print("Entered:", self.input_var.get())  # You can replace this with further logic
            self.input_var.set("")
        else:
            self.input_var.set(self.input_var.get() + key)

if __name__ == "__main__":
    app = Keypad()
    app.mainloop()
