// Terminal text insertions
const prompt = document.querySelector('.Terminal__Prompt');
const body = document.querySelector('.Terminal__body');
let inputText = ''; // variable to store user input

// list of keys to ignore
let ignore_keys = [
    'Tab',
    'Shift',
    'Control',
    'Alt',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'CapsLock'
]

// Terminal input listener
document.addEventListener('keydown', function(event) {
	const char = event.key;

    // check if the pressed key should be ignored
    if (ignore_keys.includes(char))
        return;

	if (char === 'Enter') {
		event.preventDefault();

		if (inputText.toLowerCase() === 'clear') {
            // handles clearing the terminal
			const terminalTextElements = document.querySelectorAll('.Terminal__text');
			terminalTextElements.forEach(function(element) {
				body.removeChild(element);
			});
		} 
        else {
            // handles submitting the command and getting the output back

            // create submission data
            let route = '/terminal_submit'
            let form = {
                'terminal_input': inputText
            }

            // submit terminal command
            $.post(route, form, function(data) {
                // get output from server
                let msg = data.message;
                console.log("terminal command: ", msg);

                // Split the multiline string by line breaks
                let lines = msg.split('\n');

                // Loop through each line and create a new terminal_text element
                lines.forEach(line => {
                    let _text = document.createElement('div');
                    
                    _text.classList.add('Terminal__text');
                    _text.innerHTML = color_terminal(line); 

                    body.insertBefore(_text, prompt);
                });

            }, 'json');

		}

		// reset terminal
		prompt.innerHTML = '<span class="Prompt__user">network@demo:</span><span class="Prompt__location">~</span><span class="Prompt__dollar">$</span><span class="Prompt__cursor"></span>';
		inputText = '';
	} 
    else if (char == 'Backspace') {
        // handle backspaces
		event.preventDefault();

		if (inputText.length > 0) {
			inputText = inputText.slice(0, -1);   // Remove last character from inputText
			prompt.removeChild(prompt.lastChild); // Remove last character from prompt
		}
	} 
    else {
        // handle inputing the text command
		inputText += char;
		prompt.insertBefore(document.createTextNode(char), prompt.lastChild);
	}
});

// function to apply color to text enclosed in '[' and ']'
function color_terminal(line) {
    return line.replace(/\[(.*?)\]/g, '<span class="terminal_highlight">$&</span>');
}