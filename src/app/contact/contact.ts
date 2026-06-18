import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit {
  private fb = inject(FormBuilder);
  private titleService = inject(Title);

  contactForm: FormGroup = this.fb.group({
    naam: ['', Validators.required],
    bericht: ['', Validators.required]
  });

  ngOnInit() {
    this.titleService.setTitle('Royal Antwerp Eagles | Contact');
  }

  verstuur() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const { naam, bericht } = this.contactForm.value;
    
    const subject = encodeURIComponent(`Contact via website - ${naam}`);
    const body = encodeURIComponent(`Beste Antwerp Eagles,\n\n${bericht}\n\nMet vriendelijke groeten,\n${naam}`);
    
    // Open the default mail client
    window.location.href = `mailto:secretariaat@antwerpeagles.com?subject=${subject}&body=${body}`;
    
    // Optioneel: het formulier leegmaken na het klikken
    this.contactForm.reset();
  }
}
